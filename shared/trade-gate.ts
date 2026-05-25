import type { NewsMarketAnalysis } from "./types";
import type { CalendarStatus } from "./calendar-types";
import type { MarketRegime } from "./market-regime";
import { getMarketSession } from "./market-session";

export type TradeMode = "longterm" | "short";

export interface TradeGateInput {
  bias: "long" | "short" | "wait";
  news: NewsMarketAnalysis | null;
  riskReward: number;
  confluencePct: number;
  confidence: number;
  techScore: number;
  mode: TradeMode;
  regime?: MarketRegime | null;
  calendar?: CalendarStatus | null;
  adx?: number;
}

export interface TradeGateResult {
  allowed: boolean;
  effectiveBias: "long" | "short" | "wait";
  reasonUz: string;
  capitalRuleUz: string;
  newsVerdictUz: string;
}

const MIN_RR: Record<TradeMode, number> = { longterm: 2.4, short: 2.2 };
const MIN_CONFLUENCE: Record<TradeMode, number> = { longterm: 82, short: 88 };
const MIN_CONFIDENCE: Record<TradeMode, number> = { longterm: 72, short: 76 };
const MIN_SCORE: Record<TradeMode, number> = { longterm: 3.6, short: 4.2 };
const MIN_ADX: Record<TradeMode, number> = { longterm: 18, short: 22 };
const MIN_NEWS_CONF = 58;
const MIN_NEWS_STRENGTH = 55;

export function evaluateNewsForTrade(
  news: NewsMarketAnalysis | null,
  intendedBias: "long" | "short" | "wait"
): { ok: boolean; verdictUz: string } {
  if (!news) {
    return {
      ok: false,
      verdictUz: "Yangiliklar tahlili tayyor emas — savdo OCHMANG, kapital himoya.",
    };
  }

  if (news.contradictionsUz) {
    return {
      ok: false,
      verdictUz: `YANGILIKLAR ZID: ${news.contradictionsUz}`,
    };
  }

  if (news.confidence < MIN_NEWS_CONF) {
    return {
      ok: false,
      verdictUz: `Yangiliklar ishonchi ${news.confidence}% — kamida ${MIN_NEWS_CONF}% kerak.`,
    };
  }

  if (!news.newsCandleAligned) {
    return {
      ok: false,
      verdictUz: "Yangiliklar va shamlar MOS emas — professional trader kutadi.",
    };
  }

  if (intendedBias === "long") {
    if (news.overallBias !== "bullish" || news.biasStrength < MIN_NEWS_STRENGTH) {
      return {
        ok: false,
        verdictUz: `Long uchun yangiliklar aniq BULLISH emas: ${news.overallBias} ${news.biasStrength}%.`,
      };
    }
  }

  if (intendedBias === "short") {
    if (news.overallBias !== "bearish" || news.biasStrength < MIN_NEWS_STRENGTH) {
      return {
        ok: false,
        verdictUz: `Short uchun yangiliklar aniq BEARISH emas: ${news.overallBias} ${news.biasStrength}%.`,
      };
    }
  }

  const rec = news.recommendationUz ?? "";
  if (/tavsiya:\s*hozir\s*kirmang|tavsiya:\s*.*ochmang|savdo\s*ochmang|hukm:\s*kuting/i.test(rec)) {
    return { ok: false, verdictUz: rec };
  }

  return {
    ok: true,
    verdictUz:
      news.recommendationUz?.slice(0, 120) ||
      `Yangiliklar MOS: ${news.overallBias} ${news.biasStrength}%, ishonch ${news.confidence}%.`,
  };
}

export function applyTradeGate(input: TradeGateInput): TradeGateResult {
  const capitalRuleUz =
    "KAPITAL HIMOYA: Faqat barcha filter MOS bo'lganda BUY/SELL. SL majburiy. Shubha bo'lsa HOLD — zarar kamaytirish birinchi.";

  if (input.calendar?.inHighImpactWindow) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: input.calendar.hintUz,
      capitalRuleUz,
      newsVerdictUz: input.news?.recommendationUz ?? "Makro voqea oynasi.",
    };
  }

  if (input.bias === "wait") {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: "Texnik va yangiliklar bir yo'nalish bermadi.",
      capitalRuleUz,
      newsVerdictUz: input.news?.recommendationUz ?? "Kuting.",
    };
  }

  const session = getMarketSession();
  if (input.mode === "short" && !session.primeWindow && session.volatility === "past") {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: "Scalp uchun London/NY faol sessiyasi kerak — hozir sokin vaqt.",
      capitalRuleUz,
      newsVerdictUz: input.news?.recommendationUz ?? session.hintUz,
    };
  }

  const regime = input.regime;
  if (regime) {
    if (input.bias === "long" && regime.goldLongAdjust <= -1) {
      return {
        allowed: false,
        effectiveBias: "wait",
        reasonUz: `Makro longga qarshi: ${regime.summaryUz}`,
        capitalRuleUz,
        newsVerdictUz: input.news?.recommendationUz ?? regime.summaryUz,
      };
    }
    if (input.bias === "short" && regime.goldLongAdjust >= 1) {
      return {
        allowed: false,
        effectiveBias: "wait",
        reasonUz: `Makro shortga qarshi: ${regime.summaryUz}`,
        capitalRuleUz,
        newsVerdictUz: input.news?.recommendationUz ?? regime.summaryUz,
      };
    }
  }

  const adx = input.adx ?? 0;
  if (adx > 0 && adx < MIN_ADX[input.mode]) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: `Trend kuchi past, ADX ${adx} — range, signal ishonchsiz.`,
      capitalRuleUz,
      newsVerdictUz: input.news?.recommendationUz ?? "ADX past.",
    };
  }

  const newsCheck = evaluateNewsForTrade(input.news, input.bias);
  if (!newsCheck.ok) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: newsCheck.verdictUz,
      capitalRuleUz,
      newsVerdictUz: newsCheck.verdictUz,
    };
  }

  if (input.riskReward < MIN_RR[input.mode]) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: `Risk/Foyda 1:${input.riskReward} — minimum 1:${MIN_RR[input.mode]}.`,
      capitalRuleUz,
      newsVerdictUz: newsCheck.verdictUz,
    };
  }

  if (input.confluencePct < MIN_CONFLUENCE[input.mode]) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: `Moslik ${input.confluencePct}% — kamida ${MIN_CONFLUENCE[input.mode]}% kerak.`,
      capitalRuleUz,
      newsVerdictUz: newsCheck.verdictUz,
    };
  }

  if (input.confidence < MIN_CONFIDENCE[input.mode]) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: `Ishonch ${input.confidence}% — minimum ${MIN_CONFIDENCE[input.mode]}%.`,
      capitalRuleUz,
      newsVerdictUz: newsCheck.verdictUz,
    };
  }

  if (Math.abs(input.techScore) < MIN_SCORE[input.mode]) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: "Texnik kuch yetarli emas — faqat kuchli setup.",
      capitalRuleUz,
      newsVerdictUz: newsCheck.verdictUz,
    };
  }

  return {
    allowed: true,
    effectiveBias: input.bias,
    reasonUz:
      input.mode === "short"
        ? "Barcha filter MOS — qisqa muddat: yangiliklar + TF + R:R + sessiya."
        : "Barcha filter MOS — swing: yangiliklar + texnik + makro.",
    capitalRuleUz,
    newsVerdictUz: newsCheck.verdictUz,
  };
}

export function ensureTakeProfitRR(
  entry: number,
  stopLoss: number,
  takeProfit: number,
  bias: "long" | "short",
  minRR: number
): number {
  const risk = Math.abs(entry - stopLoss);
  if (risk <= 0) return takeProfit;
  const reward = Math.abs(takeProfit - entry);
  if (reward / risk >= minRR) return Math.round(takeProfit * 100) / 100;
  if (bias === "long") return Math.round((entry + risk * minRR) * 100) / 100;
  if (bias === "short") return Math.round((entry - risk * minRR) * 100) / 100;
  return takeProfit;
}
