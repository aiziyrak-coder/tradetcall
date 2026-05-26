import type { NewsMarketAnalysis } from "./types";
import type { CalendarStatus } from "./calendar-types";
import type { MarketRegime } from "./market-regime";
import { getMarketSession } from "./market-session";
import { LONG_THRESHOLDS, SHORT_THRESHOLDS } from "./signal-thresholds";

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
  tfAligned?: number;
  tfTotal?: number;
}

export interface TradeGateResult {
  allowed: boolean;
  effectiveBias: "long" | "short" | "wait";
  reasonUz: string;
  capitalRuleUz: string;
  newsVerdictUz: string;
}

const MIN_RR: Record<TradeMode, number> = {
  longterm: LONG_THRESHOLDS.minRiskReward,
  short: SHORT_THRESHOLDS.minRiskReward,
};
const MIN_CONFLUENCE: Record<TradeMode, number> = {
  longterm: LONG_THRESHOLDS.minConfluence,
  short: SHORT_THRESHOLDS.minConfluence,
};
const MIN_CONFIDENCE: Record<TradeMode, number> = {
  longterm: LONG_THRESHOLDS.minNewsConfidence + 10,
  short: SHORT_THRESHOLDS.minNewsConfidence + 6,
};
const MIN_SCORE: Record<TradeMode, number> = {
  longterm: LONG_THRESHOLDS.minBiasScore,
  short: SHORT_THRESHOLDS.minBiasScore * 0.85,
};
const MIN_ADX: Record<TradeMode, number> = { longterm: 12, short: 10 };

export function evaluateNewsForTrade(
  news: NewsMarketAnalysis | null,
  intendedBias: "long" | "short" | "wait",
  tfAligned = 0,
  tfTotal = 0
): { ok: boolean; verdictUz: string } {
  const cfg =
    intendedBias === "short" || intendedBias === "wait"
      ? SHORT_THRESHOLDS
      : LONG_THRESHOLDS;

  if (!news) {
    const tfRatio = tfTotal > 0 ? tfAligned / tfTotal : 0;
    const minTf = intendedBias === "short" ? SHORT_THRESHOLDS.minTfVoteRatio : 0.75;
    if (tfRatio >= minTf) {
      return {
        ok: true,
        verdictUz: "TF impuls — yangiliklar ixtiyoriy (scalp).",
      };
    }
    return {
      ok: false,
      verdictUz: "Yangiliklar tahlili tayyor emas — kuting yoki faqat TF.",
    };
  }

  if (news.contradictionsUz) {
    return {
      ok: false,
      verdictUz: `YANGILIKLAR ZID: ${news.contradictionsUz}`,
    };
  }

  if (news.confidence < cfg.minNewsConfidence) {
    const tfMin = intendedBias === "short" ? SHORT_THRESHOLDS.minTfVoteRatio : 0.6;
    const tfOk = tfTotal > 0 && tfAligned / tfTotal >= tfMin;
    if (!tfOk) {
      return {
        ok: false,
        verdictUz: `Yangiliklar ishonchi ${news.confidence}% — past.`,
      };
    }
  }

  const tfOk = tfTotal > 0 && tfAligned / tfTotal >= SHORT_THRESHOLDS.minTfVoteRatio;
  const softAlign = news.newsCandleAligned || tfOk;

  const minConfSoft = intendedBias === "short" ? 42 : 55;
  if (!softAlign && news.confidence < minConfSoft) {
    return {
      ok: false,
      verdictUz: "Yangiliklar va shamlar/TF mos emas.",
    };
  }

  if (intendedBias === "long") {
    const bullOk =
      (news.overallBias === "bullish" && news.biasStrength >= cfg.minNewsStrength) ||
      (news.overallBias === "neutral" && news.confidence >= 50 && tfOk);
    if (!bullOk && news.overallBias === "bearish" && news.biasStrength >= 50) {
      return {
        ok: false,
        verdictUz: `Long uchun bearish yangiliklar kuchli: ${news.biasStrength}%.`,
      };
    }
  }

  if (intendedBias === "short") {
    const bearOk =
      (news.overallBias === "bearish" && news.biasStrength >= cfg.minNewsStrength) ||
      (news.overallBias === "neutral" && news.confidence >= 40 && tfOk) ||
      (tfOk && news.overallBias !== "bullish");
    if (!bearOk && news.overallBias === "bullish" && news.biasStrength >= 55) {
      return {
        ok: false,
        verdictUz: `Short uchun bullish yangiliklar kuchli: ${news.biasStrength}%.`,
      };
    }
  }

  const rec = news.recommendationUz ?? "";
  if (/tavsiya:\s*hozir\s*kirmang|savdo\s*ochmang/i.test(rec) && !tfOk) {
    return { ok: false, verdictUz: rec };
  }

  return {
    ok: true,
    verdictUz:
      news.recommendationUz?.slice(0, 120) ||
      `Yangiliklar: ${news.overallBias} ${news.biasStrength}%, ishonch ${news.confidence}%.`,
  };
}

export function applyTradeGate(input: TradeGateInput): TradeGateResult {
  const capitalRuleUz =
    "Uzoq: kuniga 0–1 setup. Yaqin: TF mos kelganda signal. SL majburiy.";

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
      reasonUz: "TF va texnik bir yo'nalish bermadi.",
      capitalRuleUz,
      newsVerdictUz: input.news?.recommendationUz ?? "Kuting.",
    };
  }

  const session = getMarketSession();
  if (
    input.mode === "short" &&
    !session.active &&
    session.volatility === "past"
  ) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: "Scalp uchun bozor faol emas — London/NY ochilishini kuting.",
      capitalRuleUz,
      newsVerdictUz: input.news?.recommendationUz ?? session.hintUz,
    };
  }

  const regime = input.regime;
  if (regime) {
    if (input.bias === "long" && regime.goldLongAdjust <= -2) {
      return {
        allowed: false,
        effectiveBias: "wait",
        reasonUz: `Makro longga qarshi: ${regime.summaryUz}`,
        capitalRuleUz,
        newsVerdictUz: input.news?.recommendationUz ?? regime.summaryUz,
      };
    }
    if (input.bias === "short" && regime.goldLongAdjust >= 2) {
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
    const tfStrong =
      (input.tfTotal ?? 0) > 0 &&
      (input.tfAligned ?? 0) / (input.tfTotal ?? 1) >= 0.75;
    if (!tfStrong) {
      return {
        allowed: false,
        effectiveBias: "wait",
        reasonUz: `ADX ${adx} past — trend zaif.`,
        capitalRuleUz,
        newsVerdictUz: input.news?.recommendationUz ?? "ADX past.",
      };
    }
  }

  const newsCheck = evaluateNewsForTrade(
    input.news,
    input.bias,
    input.tfAligned ?? 0,
    input.tfTotal ?? 0
  );
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
      reasonUz: `R:R 1:${input.riskReward} — minimum 1:${MIN_RR[input.mode]}.`,
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

  const tfRatio =
    (input.tfTotal ?? 0) > 0 ? (input.tfAligned ?? 0) / (input.tfTotal ?? 1) : 0;
  const scalpMomentum =
    input.mode === "short" &&
    tfRatio >= SHORT_THRESHOLDS.minTfVoteRatio &&
    (input.adx ?? 0) >= MIN_ADX.short;

  if (input.confidence < MIN_CONFIDENCE[input.mode] && !scalpMomentum) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: `Ishonch ${input.confidence}% — minimum ${MIN_CONFIDENCE[input.mode]}%.`,
      capitalRuleUz,
      newsVerdictUz: newsCheck.verdictUz,
    };
  }

  if (Math.abs(input.techScore) < MIN_SCORE[input.mode] && !scalpMomentum) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: "Texnik/TF kuchi yetarli emas.",
      capitalRuleUz,
      newsVerdictUz: newsCheck.verdictUz,
    };
  }

  const leadTf =
    input.mode === "short" && input.tfTotal
      ? `${input.tfAligned}/${input.tfTotal} TF`
      : "swing";

  return {
    allowed: true,
    effectiveBias: input.bias,
    reasonUz:
      input.mode === "short"
        ? `Signal: ${leadTf} + yangiliklar + R:R MOS.`
        : "Swing signal: texnik + yangiliklar + makro.",
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
