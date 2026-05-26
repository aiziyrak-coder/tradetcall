import type { SignalCheckItem, SignalDetail } from "./signal-detail";
import { LONG_THRESHOLDS, SHORT_THRESHOLDS } from "./signal-thresholds";
import type { TradeGateResult } from "./trade-gate";
import type { NewsMarketAnalysis, TechnicalAnalysis } from "./types";

export type TradeAction = "BUY" | "SELL" | "HOLD";

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
  leadTimeframeUz?: string;
  tfSummaryUz?: string;
}

function applyCapitalProtection(
  horizon: "long" | "short",
  action: TradeAction,
  strength: number,
  gate: TradeGateResult,
  news: NewsMarketAnalysis | null,
  signal: SignalDetail,
  confluencePct: number,
  tfAligned: number,
  tfTotal: number
): { action: TradeAction; reliabilityUz: string } {
  const cfg = horizon === "short" ? SHORT_THRESHOLDS : LONG_THRESHOLDS;

  if (action === "HOLD") {
    return { action: "HOLD", reliabilityUz: "Kutiling — setup tayyor emas" };
  }

  const tfOk = tfTotal > 0 && tfAligned / tfTotal >= SHORT_THRESHOLDS.minTfVoteRatio;
  const newsDirOk =
    horizon === "long"
      ? news?.overallBias !== "bearish" || (news?.biasStrength ?? 0) < 35
      : news?.overallBias !== "bullish" || (news?.biasStrength ?? 0) < 35;

  const shortRelaxed = horizon === "short";
  const checks = [
    gate.allowed,
    !news || news.confidence >= cfg.minNewsConfidence || (shortRelaxed && tfOk),
    news?.newsCandleAligned === true || tfOk || newsDirOk || (shortRelaxed && !news),
    !news?.contradictionsUz,
    signal.riskReward >= cfg.minRiskReward,
    confluencePct >= (shortRelaxed ? cfg.minConfluence - 5 : cfg.minConfluence),
    strength >= (shortRelaxed ? cfg.minStrength - 4 : cfg.minStrength),
  ];
  const passed = checks.filter(Boolean).length;
  if (passed < cfg.minFilters) {
    return {
      action: "HOLD",
      reliabilityUz: `Aniq emas — ${passed}/${cfg.filterTotal} filter — kichik lot yoki kuting`,
    };
  }

  const tier =
    passed >= cfg.filterTotal && strength >= cfg.minStrength + 8
      ? "Kuchli"
      : "Aniq";
  return {
    action,
    reliabilityUz: `${tier} signal — ${passed}/${cfg.filterTotal} filter MOS, SL majburiy`,
  };
}

function newsDirectionScore(na: NewsMarketAnalysis | null, forLong: boolean): number {
  if (!na) return 0;
  let s = 0;
  if (na.overallBias === "bullish") s += na.biasStrength * 0.5;
  if (na.overallBias === "bearish") s -= na.biasStrength * 0.5;
  if (!na.newsCandleAligned) s *= 0.45;
  if (na.contradictionsUz) return 0;
  s += (na.confidence - 50) * 0.3;
  const dirOk =
    forLong
      ? na.overallBias !== "bearish"
      : na.overallBias !== "bullish";
  if (!dirOk && na.biasStrength > 50) s *= 0.5;
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
  tfAligned?: number;
  tfTotal?: number;
  leadTimeframeUz?: string;
}): HorizonVerdict {
  const { horizon, finalBias, gate, news, tech, signal } = input;
  const cfg = horizon === "short" ? SHORT_THRESHOLDS : LONG_THRESHOLDS;
  const forLong = horizon === "long";
  const tfAligned = input.tfAligned ?? (forLong ? (finalBias === "long" ? 1 : finalBias === "short" ? 1 : 0) : 0);
  const tfTotal = input.tfTotal ?? (forLong ? 1 : 4);

  const tfRatio = tfTotal > 0 ? tfAligned / tfTotal : 0;
  const shortScalp =
    horizon === "short" &&
    tfRatio >= SHORT_THRESHOLDS.minTfVoteRatio &&
    input.confidence >= SHORT_THRESHOLDS.minNewsConfidence;

  let action: TradeAction = "HOLD";
  if (finalBias === "long" && (gate.allowed || shortScalp)) action = "BUY";
  else if (finalBias === "short" && (gate.allowed || shortScalp)) action = "SELL";

  const newsDir = newsDirectionScore(news, forLong);
  const techDir =
    tech.trend === "bullish" ? 38 : tech.trend === "bearish" ? -38 : 0;
  const techDir2 = (tech.rsi - 50) * 0.35 + (tech.adx >= 22 ? 12 : tech.adx >= 16 ? 6 : 0);

  let rawStrength =
    Math.abs(newsDir) * 0.52 +
    Math.abs(techDir + techDir2) * 0.22 +
    input.confluencePct * 0.16 +
    input.confidence * 0.1;

  if (tfTotal > 0) {
    rawStrength += (tfAligned / tfTotal) * 18;
  }

  if (!news || news.confidence < cfg.minNewsConfidence) rawStrength = Math.min(rawStrength, 48);
  if (!gate.allowed) rawStrength = Math.min(rawStrength, 50);

  const actionBoost =
    action !== "HOLD" && gate.allowed && signal.inEntryZone ? 10 : 0;
  let strength = Math.min(98, Math.round(rawStrength + actionBoost));

  const cap = applyCapitalProtection(
    horizon,
    action,
    strength,
    gate,
    news,
    signal,
    input.confluencePct,
    tfAligned,
    tfTotal
  );
  action = cap.action;
  if (action === "HOLD") strength = Math.min(strength, 55);

  const newsWeightPct = 55;
  const techWeightPct = 45;

  const tfSummaryUz =
    input.leadTimeframeUz && tfTotal > 0
      ? `Asosiy TF: ${input.leadTimeframeUz} · ${tfAligned}/${tfTotal} mos`
      : tfTotal > 0
        ? `${tfAligned}/${tfTotal} timeframe mos`
        : "";

  const newsBlock = news
    ? `YANGILIKLAR [${news.overallBias} ${news.biasStrength}%, ishonch ${news.confidence}%]: ${
        news.tradeVerdictUz?.slice(0, 100) ?? news.recommendationUz?.slice(0, 100) ?? ""
      } ${news.newsCandleAligned ? "✓ Sham MOS" : "△ Qisman mos"}`
    : "YANGILIKLAR: yetarli emas.";

  const techBlock = `TEXNIK: ${tech.trend}, RSI ${tech.rsi}, ADX ${tech.adx}. ${tech.momentum}`;

  const analysisUz =
    action === "HOLD"
      ? `${newsBlock}. ${techBlock}. ${tfSummaryUz} ${cap.reliabilityUz}. ${gate.reasonUz.slice(0, 80)}`
      : `${newsBlock}. ${techBlock}. ${tfSummaryUz} ${cap.reliabilityUz}.`;

  const forecastUz =
    news?.trendOutlookUz?.slice(0, 200) ||
    news?.forecastUz?.slice(0, 200) ||
    input.playbookUz?.slice(0, 160) ||
    (forLong
      ? "Swing: kuniga 0–1 ta aniq setup yetarli."
      : `Scalp: ${input.leadTimeframeUz ?? "5m"} TF asosida, 30 daqiqa.`);

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
        Math.abs(newsDir) + (news?.confidence ?? 0) * 0.35 + (news?.newsCandleAligned ? 15 : 5)
      ),
      noteUz: news ? `${news.overallBias} ${news.biasStrength}%` : "—",
    },
    {
      label: "Texnik",
      score: Math.min(100, Math.abs(techDir + techDir2) + tech.adx),
      noteUz: `${tech.trend} RSI${tech.rsi}`,
    },
    {
      label: "TF",
      score: tfTotal > 0 ? Math.round((tfAligned / tfTotal) * 100) : input.confluencePct,
      noteUz: tfTotal > 0 ? `${tfAligned}/${tfTotal}` : "—",
    },
    {
      label: "Gate",
      score: gate.allowed ? 90 : 25,
      noteUz: gate.allowed ? "OK" : "Blok",
    },
  ];

  const checklist: SignalCheckItem[] = [
    {
      ok: !!news && news.confidence >= cfg.minNewsConfidence,
      textUz: news ? `Yangiliklar ${news.confidence}%` : "Yangiliklar yo'q",
    },
    {
      ok: news?.newsCandleAligned === true || (tfTotal > 0 && tfAligned / tfTotal >= 0.5),
      textUz:
        news?.newsCandleAligned || (tfTotal > 0 && tfAligned / tfTotal >= 0.5)
          ? "Yangilik yoki TF mos"
          : "Moslik past",
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
      ok: signal.riskReward >= cfg.minRiskReward,
      textUz: `R:R 1:${signal.riskReward} · min 1:${cfg.minRiskReward}`,
    },
    {
      ok: input.confluencePct >= cfg.minConfluence,
      textUz: `Moslik ${input.confluencePct}%`,
    },
    {
      ok: strength >= cfg.minStrength && action !== "HOLD",
      textUz:
        action !== "HOLD"
          ? `Kuch ${strength}%`
          : `Kuch ${strength}% — signal yo'q`,
    },
  ];

  return {
    horizon,
    horizonLabelUz: forLong ? "Uzoq muddat swing" : "Yaqin scalp 30 daqiqa",
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
    leadTimeframeUz: input.leadTimeframeUz,
    tfSummaryUz,
  };
}
