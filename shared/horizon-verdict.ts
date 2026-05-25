import type { SignalCheckItem, SignalDetail } from "./signal-detail";
import type { TradeGateResult } from "./trade-gate";
import type { NewsMarketAnalysis, TechnicalAnalysis } from "./types";

export type TradeAction = "BUY" | "SELL" | "HOLD";

export interface HorizonVerdict {
  horizon: "long" | "short";
  horizonLabelUz: string;
  action: TradeAction;
  /** 0–100 — yangiliklar asosiy (50%+) */
  strength: number;
  newsWeightPct: number;
  techWeightPct: number;
  /** TAHLIL — bitta matn, yangiliklar birinchi */
  analysisUz: string;
  /** BASHORAT */
  forecastUz: string;
  /** SIGNAL — bitta qator amal */
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
  /** Qisqa omillar */
  pillars: { label: string; score: number; noteUz: string }[];
}

function biasToAction(
  bias: "long" | "short" | "wait",
  gate: TradeGateResult
): TradeAction {
  if (!gate.allowed || bias === "wait") return "HOLD";
  if (bias === "long") return "BUY";
  return "SELL";
}

function newsDirectionScore(na: NewsMarketAnalysis | null, forLong: boolean): number {
  if (!na) return 0;
  let s = 0;
  if (na.overallBias === "bullish") s += na.biasStrength * 0.45;
  if (na.overallBias === "bearish") s -= na.biasStrength * 0.45;
  if (na.newsCandleAligned) s += forLong ? 12 : 12 * Math.sign(s || 1);
  else s *= 0.55;
  if (na.contradictionsUz) s *= 0.15;
  s += (na.confidence - 50) * 0.2;
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
  extraContextUz?: string;
}): HorizonVerdict {
  const { horizon, finalBias, gate, news, tech, signal } = input;
  const forLong = horizon === "long";
  const action = biasToAction(finalBias, gate);

  const newsDir = newsDirectionScore(news, forLong);
  const techDir =
    tech.trend === "bullish" ? 35 : tech.trend === "bearish" ? -35 : 0;
  const techDir2 = (tech.rsi - 50) * 0.4 + (tech.adx >= 22 ? 8 : -5);

  let rawStrength =
    Math.abs(newsDir) * 0.52 +
    Math.abs(techDir + techDir2) * 0.22 +
    input.confluencePct * 0.16 +
    input.confidence * 0.1;

  if (!news) rawStrength *= 0.45;
  if (!gate.allowed) rawStrength = Math.min(rawStrength, 48);
  if (action === "HOLD") rawStrength = Math.min(rawStrength, 55);

  const actionBoost =
    action !== "HOLD" && gate.allowed && signal.inEntryZone ? 18 : action !== "HOLD" && gate.allowed ? 8 : 0;
  const strength = Math.min(98, Math.round(rawStrength + actionBoost));

  const newsWeightPct = 55;
  const techWeightPct = 45;

  const newsBlock = news
    ? `YANGILIKLAR (${news.overallBias}, kuch ${news.biasStrength}%): ${
        news.tradeVerdictUz?.slice(0, 120) ?? news.recommendationUz?.slice(0, 120) ?? ""
      } ${news.newsCandleAligned ? "Shamlar bilan MOS." : "Shamlar to'liq mos emas."}`
    : "YANGILIKLAR: tahlil kutilmoqda — signal HOLD.";

  const techBlock = `TEXNIK: trend ${tech.trend}, RSI ${tech.rsi}, ADX ${tech.adx}. ${tech.momentum}`;

  const analysisUz =
    action === "HOLD" && !gate.allowed
      ? `${newsBlock} ${techBlock} GATE: ${gate.reasonUz.slice(0, 100)}`
      : `${newsBlock} ${techBlock}`;

  const forecastUz =
    news?.aiFutureOutlookUz?.slice(0, 200) ||
    news?.trendOutlookUz?.slice(0, 200) ||
    news?.forecastUz?.slice(0, 200) ||
    input.playbookUz?.slice(0, 180) ||
    (forLong
      ? "Swing: yangiliklar va makro bir yo'nalish bermaguncha katta lot yo'q."
      : "Scalp: faqat TF + yangiliklar MOS bo'lganda 30 daqiqa ichida.");

  let signalUz: string;
  if (action === "BUY") {
    signalUz = gate.allowed
      ? `BUY — kirish $${signal.entryFrom}–$${signal.entryTo}, SL $${signal.stopLoss}, TP $${signal.takeProfit}, R:R 1:${signal.riskReward}${
          signal.inEntryZone ? " (zona ichida)" : ""
        }`
      : `HOLD — ${gate.reasonUz.slice(0, 80)}`;
  } else if (action === "SELL") {
    signalUz = gate.allowed
      ? `SELL — kirish $${signal.entryFrom}–$${signal.entryTo}, SL $${signal.stopLoss}, TP $${signal.takeProfit}, R:R 1:${signal.riskReward}${
          signal.inEntryZone ? " (zona ichida)" : ""
        }`
      : `HOLD — ${gate.reasonUz.slice(0, 80)}`;
  } else {
    signalUz = `HOLD — ${gate.reasonUz.slice(0, 90)}`;
  }

  const pillars = [
    {
      label: "Yangiliklar",
      score: Math.min(100, Math.abs(newsDir) + (news?.confidence ?? 0) * 0.3),
      noteUz: news
        ? `${news.overallBias} ${news.biasStrength}%`
        : "Kutilmoqda",
    },
    {
      label: "Texnik",
      score: Math.min(100, Math.abs(techDir + techDir2) + tech.adx),
      noteUz: `${tech.trend} · RSI ${tech.rsi}`,
    },
    {
      label: "TF/R:R",
      score: input.confluencePct,
      noteUz: `Konfluens ${input.confluencePct}% · R:R 1:${signal.riskReward}`,
    },
    {
      label: "Gate",
      score: gate.allowed ? 95 : 25,
      noteUz: gate.allowed ? "Ruxsat" : "Blok",
    },
  ];

  const checklist: SignalCheckItem[] = [
    {
      ok: !!news && news.confidence >= 52,
      textUz: news
        ? `Yangiliklar tayyor (${news.confidence}%)`
        : "Yangiliklar yo'q — HOLD",
    },
    {
      ok: news?.newsCandleAligned ?? false,
      textUz: news?.newsCandleAligned
        ? "Yangilik + sham MOS"
        : "Yangilik/sham mos emas",
    },
    {
      ok: gate.allowed,
      textUz: gate.allowed ? "Professional gate: OK" : gate.reasonUz.slice(0, 72),
    },
    ...signal.checklist.slice(3),
  ];

  return {
    horizon,
    horizonLabelUz: forLong ? "Uzoq muddat (swing)" : "Yaqin (scalp 30daq)",
    action,
    strength,
    newsWeightPct,
    techWeightPct,
    analysisUz,
    forecastUz,
    signalUz,
    gateAllowed: gate.allowed,
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
