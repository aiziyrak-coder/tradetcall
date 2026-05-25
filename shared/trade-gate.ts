import type { NewsMarketAnalysis } from "./types";

export type TradeMode = "longterm" | "short";

export interface TradeGateInput {
  bias: "long" | "short" | "wait";
  news: NewsMarketAnalysis | null;
  riskReward: number;
  confluencePct: number;
  confidence: number;
  techScore: number;
  mode: TradeMode;
}

export interface TradeGateResult {
  allowed: boolean;
  effectiveBias: "long" | "short" | "wait";
  reasonUz: string;
  capitalRuleUz: string;
  newsVerdictUz: string;
}

const MIN_RR: Record<TradeMode, number> = { longterm: 2, short: 1.8 };
const MIN_CONFLUENCE: Record<TradeMode, number> = { longterm: 72, short: 78 };
const MIN_CONFIDENCE: Record<TradeMode, number> = { longterm: 58, short: 62 };
const MIN_SCORE: Record<TradeMode, number> = { longterm: 2.6, short: 3 };

/** Yangiliklar savdo uchun ruxsat beradimi — asosiy filter */
export function evaluateNewsForTrade(
  news: NewsMarketAnalysis | null,
  intendedBias: "long" | "short" | "wait"
): { ok: boolean; verdictUz: string } {
  if (!news) {
    return {
      ok: false,
      verdictUz: "Yangiliklar tahlili hali tayyor emas — savdo ochmang, tahlil tugashini kuting.",
    };
  }

  if (news.contradictionsUz) {
    return {
      ok: false,
      verdictUz: `YANGILIKLAR ZID: ${news.contradictionsUz}`,
    };
  }

  if (news.confidence < 45) {
    return {
      ok: false,
      verdictUz: `Yangiliklar ishonchi past (${news.confidence}%) — faqat aniq fon bo'lganda kirish.`,
    };
  }

  if (intendedBias === "long") {
    if (news.overallBias === "bearish" && news.biasStrength >= 50) {
      return {
        ok: false,
        verdictUz: "Makro yangiliklar SHORT yo'nalishda — LONG ochish professional emas.",
      };
    }
    if (!news.newsCandleAligned && news.overallBias !== "bullish") {
      return {
        ok: false,
        verdictUz: "Yangiliklar va shamlar mos emas — long uchun ikkalasi ham tasdiqlanishi kerak.",
      };
    }
    if (news.overallBias === "neutral" && news.biasStrength < 60) {
      return {
        ok: false,
        verdictUz: "Yangiliklar neytral — katta lot ochmang, kuting.",
      };
    }
  }

  if (intendedBias === "short") {
    if (news.overallBias === "bullish" && news.biasStrength >= 50) {
      return {
        ok: false,
        verdictUz: "Yangiliklar LONG yo'nalishda — short ochish xavfli.",
      };
    }
    if (!news.newsCandleAligned && news.overallBias !== "bearish") {
      return {
        ok: false,
        verdictUz: "Yangiliklar va shamlar short uchun mos emas — kuting.",
      };
    }
    if (news.overallBias === "neutral" && news.biasStrength < 60) {
      return {
        ok: false,
        verdictUz: "Yangiliklar aniq emas — short uchun kuting.",
      };
    }
  }

  const rec = news.recommendationUz ?? "";
  if (/tavsiya:\s*hozir\s*kirmang|tavsiya:\s*.*ochmang|savdo\s*ochmang/i.test(rec)) {
    return { ok: false, verdictUz: rec };
  }

  return {
    ok: true,
    verdictUz:
      news.aiDiscussionUz?.slice(0, 120) ||
      news.recommendationUz ||
      `Yangiliklar: ${news.overallBias}, kuch ${news.biasStrength}% — ${news.newsCandleAligned ? "shamlar bilan MOS" : "qo'shimcha tasdiq kerak"}.`,
  };
}

export function applyTradeGate(input: TradeGateInput): TradeGateResult {
  const capitalRuleUz =
    "PRO QOIDA: Kapitalni himoya qiling — har bir lotda SL majburiy, R:R past bo'lsa KIRMANG, yangiliklar zid bo'lsa KIRMANG.";

  if (input.bias === "wait") {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: "Texnik va yangiliklar hali bir yo'nalish bermadi.",
      capitalRuleUz,
      newsVerdictUz: input.news?.recommendationUz ?? "Kuting.",
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
      reasonUz: `Risk/Foyda 1:${input.riskReward} — minimum 1:${MIN_RR[input.mode]} kerak. Lot ochish bekorga.`,
      capitalRuleUz,
      newsVerdictUz: newsCheck.verdictUz,
    };
  }

  if (input.confluencePct < MIN_CONFLUENCE[input.mode]) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: `Moslik ${input.confluencePct}% — kamida ${MIN_CONFLUENCE[input.mode]}% bo'lishi kerak.`,
      capitalRuleUz,
      newsVerdictUz: newsCheck.verdictUz,
    };
  }

  if (input.confidence < MIN_CONFIDENCE[input.mode]) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: `Ishonch ${input.confidence}% — professional kirish uchun ${MIN_CONFIDENCE[input.mode]}%+ kerak.`,
      capitalRuleUz,
      newsVerdictUz: newsCheck.verdictUz,
    };
  }

  if (Math.abs(input.techScore) < MIN_SCORE[input.mode]) {
    return {
      allowed: false,
      effectiveBias: "wait",
      reasonUz: "Texnik kuch yetarli emas — haqiqiy trader faqat kuchli signalda kiradi.",
      capitalRuleUz,
      newsVerdictUz: newsCheck.verdictUz,
    };
  }

  return {
    allowed: true,
    effectiveBias: input.bias,
    reasonUz:
      input.mode === "short"
        ? "Qisqa muddat: yangiliklar + TF + R:R professional mezonlarda — lot ochish mumkin (SL qat'iy)."
        : "Uzoq muddat: yangiliklar va texnik MOS — swing kirish mumkin (1 haftada 0–1 lot).",
    capitalRuleUz,
    newsVerdictUz: newsCheck.verdictUz,
  };
}

/** TP ni minimal R:R ga moslashtirish — har lotda mantiqiy foyda */
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
