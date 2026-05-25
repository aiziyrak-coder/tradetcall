import type { SignalCheckItem, SignalDetail } from "./signal-detail";
import type { TradeGateResult } from "./trade-gate";
import type { NewsMarketAnalysis, TechnicalAnalysis } from "./types";

export type TradeAction = "BUY" | "SELL" | "HOLD";

/** BUY/SELL faqat shu kuchdan yuqori */
const MIN_TRADE_STRENGTH = 82;
const MIN_PILLAR_SCORE = 70;

export interface HorizonVerdict {
  horizon: "long" | "short";
  horizonLabelUz: string;
  action: TradeAction;
  strength: number;
  reliabilityUz: string;
  newsWeightPct: number;
  techWeightPct: number;
  analysisUz: string;
  forecastUz: string;
  signalUz: string;
  gateAllowed: boolean;
  newsAligned: boolean;
  newsBias: string;
  newsStrength: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  inEntryZone: boolean;
  checklist: SignalCheckItem[];
  pillars: { label: string; score: number; noteUz: string }[];
}

function applyCapitalProtection(
  action: TradeAction,
  strength: number,
  gate: TradeGateResult,
  news: NewsMarketAnalysis | null,
  signal: SignalDetail,
  confluencePct: number
): { action: TradeAction; reliabilityUz: string } {
  if (action === "HOLD") {
    return { action: "HOLD", reliabilityUz: "Kutiling — setup tayyor emas" };
  }

  const checks = [
    gate.allowed,
    !!news && news.confidence >= 58,
    news?.newsCandleAligned === true,
    !news?.contradictionsUz,
    signal.riskReward >= 2.2,
    confluencePct >= 82,
    strength >= MIN_TRADE_STRENGTH,
  ];
  const passed = checks.filter(Boolean).length;
  if (passed < 7) {
    return {
      action: "HOLD",
      reliabilityUz: `Ishonchli emas (${passed}/7 filter) — savdo qilmang`,
    };
  }

  return {
    action,
    reliabilityUz: "Ishonchli signal — barcha filter MOS (SL majburiy)",
  };
}

function newsDirectionScore(na: NewsMarketAnalysis | null, forLong: boolean): number {
  if (!na) return 0;
  let s = 0;
  if (na.overallBias === "bullish") s += na.biasStrength * 0.5;
  if (na.overallBias === "bearish") s -= na.biasStrength * 0.5;
  if (!na.newsCandleAligned) s *= 0.2;
  if (na.contradictionsUz) return 0;
  s += (na.confidence - 50) * 0.25;
  const dirOk =
    forLong ? na.overallBias === "bullish" : na.overallBias === "bearish";
  if (!dirOk) s *= 0.35;
  return Math.max(-100, Math.min(100, Math.round(s)));
}

export function buildHorizonVerdict(input: {
  horizon: "long" | "short";
  finalBias: "long" | "short" | "wait";
  gate: TradeGateResult;
  news: NewsMarketAnalysis | null;
  tech: TechnicalAnalysis;
  signal: SignalDetail;
  confidence: number;
  confluencePct: number;
  playbookUz?: string;
}): HorizonVerdict {
  const { horizon, finalBias, gate, news, tech, signal } = input;
  const forLong = horizon === "long";

  let action: TradeAction = "HOLD";
  if (gate.allowed && finalBias === "long") action = "BUY";
  else if (gate.allowed && finalBias === "short") action = "SELL";

  const newsDir = newsDirectionScore(news, forLong);
  const techDir =
    tech.trend === "bullish" ? 38 : tech.trend === "bearish" ? -38 : 0;
  const techDir2 = (tech.rsi - 50) * 0.35 + (tech.adx >= 24 ? 12 : tech.adx >= 18 ? 4 : -8);

  let rawStrength =
    Math.abs(newsDir) * 0.58 +
    Math.abs(techDir + techDir2) * 0.18 +
    input.confluencePct * 0.14 +
    input.confidence * 0.1;

  if (!news || news.confidence < 58) rawStrength = Math.min(rawStrength, 40);
  if (!gate.allowed) rawStrength = Math.min(rawStrength, 45);

  const actionBoost =
    action !== "HOLD" && gate.allowed && signal.inEntryZone ? 12 : 0;
  let strength = Math.min(98, Math.round(rawStrength + actionBoost));

  const cap = applyCapitalProtection(
    action,
    strength,
    gate,
    news,
    signal,
    input.confluencePct
  );
  action = cap.action;
  if (action === "HOLD") strength = Math.min(strength, 52);

  const newsWeightPct = 60;
  const techWeightPct = 40;

  const newsBlock = news
    ? `YANGILIKLAR [${news.overallBias} ${news.biasStrength}%, ishonch ${news.confidence}%]: ${
        news.tradeVerdictUz?.slice(0, 100) ?? news.recommendationUz?.slice(0, 100) ?? ""
      } ${news.newsCandleAligned ? "✓ Sham MOS" : "✗ Sham mos emas"}`
    : "YANGILIKLAR: yetarli emas — HOLD.";

  const techBlock = `TEXNIK: ${tech.trend}, RSI ${tech.rsi}, ADX ${tech.adx}. ${tech.momentum}`;

  const analysisUz =
    action === "HOLD"
      ? `${newsBlock}. ${techBlock}. ${cap.reliabilityUz}. ${gate.reasonUz.slice(0, 90)}`
      : `${newsBlock}. ${techBlock}. ${cap.reliabilityUz}.`;

  const forecastUz =
    news?.trendOutlookUz?.slice(0, 200) ||
    news?.forecastUz?.slice(0, 200) ||
    input.playbookUz?.slice(0, 160) ||
    (forLong
      ? "Swing: faqat yangiliklar + texnik + makro to'liq MOS bo'lganda."
      : "Scalp: 30 daqiqa, faqat kuchli yangiliklar fonida.");

  let signalUz: string;
  if (action === "BUY") {
    signalUz = `BUY — $${signal.entryFrom}–$${signal.entryTo}, SL $${signal.stopLoss}, TP $${signal.takeProfit}, R:R 1:${signal.riskReward}${
      signal.inEntryZone ? " · zona ichida" : " · zonani kuting"
    }`;
  } else if (action === "SELL") {
    signalUz = `SELL — $${signal.entryFrom}–$${signal.entryTo}, SL $${signal.stopLoss}, TP $${signal.takeProfit}, R:R 1:${signal.riskReward}${
      signal.inEntryZone ? " · zona ichida" : " · zonani kuting"
    }`;
  } else {
    signalUz = `HOLD — ${gate.reasonUz.slice(0, 85)}`;
  }

  const pillars = [
    {
      label: "Yangiliklar",
      score: Math.min(
        100,
        Math.abs(newsDir) + (news?.confidence ?? 0) * 0.35 + (news?.newsCandleAligned ? 15 : 0)
      ),
      noteUz: news ? `${news.overallBias} ${news.biasStrength}%` : "—",
    },
    {
      label: "Texnik",
      score: Math.min(100, Math.abs(techDir + techDir2) + tech.adx),
      noteUz: `${tech.trend} RSI${tech.rsi}`,
    },
    {
      label: "Moslik",
      score: input.confluencePct,
      noteUz: `${input.confluencePct}%`,
    },
    {
      label: "Gate",
      score: gate.allowed ? 95 : 20,
      noteUz: gate.allowed ? "OK" : "Blok",
    },
  ];

  const checklist: SignalCheckItem[] = [
    {
      ok: !!news && news.confidence >= 58,
      textUz: news ? `Yangiliklar ${news.confidence}%` : "Yangiliklar yo'q",
    },
    {
      ok: news?.newsCandleAligned === true,
      textUz: news?.newsCandleAligned ? "Yangilik+sham MOS" : "Mos emas — HOLD",
    },
    {
      ok: !news?.contradictionsUz,
      textUz: news?.contradictionsUz ? "Zid yangiliklar" : "Zidlik yo'q",
    },
    {
      ok: gate.allowed,
      textUz: gate.allowed ? "Gate ruxsat" : gate.reasonUz.slice(0, 65),
    },
    {
      ok: signal.riskReward >= 2.2,
      textUz: `R:R 1:${signal.riskReward}`,
    },
    {
      ok: strength >= MIN_TRADE_STRENGTH && action !== "HOLD",
      textUz:
        action !== "HOLD"
          ? `Kuch ${strength}% — ishonchli`
          : `Kuch ${strength}% — yetarli emas`,
    },
  ];

  return {
    horizon,
    horizonLabelUz: forLong ? "Uzoq muddat (swing)" : "Yaqin (scalp 30daq)",
    action,
    strength,
    reliabilityUz: cap.reliabilityUz,
    newsWeightPct,
    techWeightPct,
    analysisUz,
    forecastUz,
    signalUz,
    gateAllowed: gate.allowed && action !== "HOLD",
    newsAligned: news?.newsCandleAligned ?? false,
    newsBias: news?.overallBias ?? "neutral",
    newsStrength: news?.biasStrength ?? 0,
    entry: signal.entryPrice,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    riskReward: signal.riskReward,
    inEntryZone: signal.inEntryZone,
    checklist,
    pillars,
  };
}
