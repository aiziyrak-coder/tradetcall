import type { NewsMarketAnalysis } from "./types";
import type { TechnicalAnalysis } from "./types";
import type { M1ScalpLead } from "./m1-scalp";
import type { LiveMomentum } from "./scalp-signal-guard";
import { MIN_TP_USD } from "./pip-targets";

export const SYSTEM_AI_TRADE_SIGNAL_COMPACT = `XAUUSD bashoratchi. FAQAT JSON.
entry=hozirgi narx. TP/SL — qarshilik va qo'llab-quvvatlashdan; min $${MIN_TP_USD} masofa, lekin har doim $5 emas.
HOLD bo'lsa diapazon va breakout ssenariylari analysisUz da.`;

export function buildCompactAiTradeSignalPrompt(input: {
  price: number;
  changePercent: number;
  tech: TechnicalAnalysis;
  tech5: TechnicalAnalysis;
  setupScore: number;
  longScore: number;
  shortScore: number;
  m1Scalp: M1ScalpLead | null;
  live: LiveMomentum;
  news: NewsMarketAnalysis | null;
  suggestedAction?: "BUY" | "SELL" | null;
  forecastHigh?: number;
  forecastLow?: number;
  suggestedTp?: number;
  suggestedSl?: number;
}): string {
  const e1 = input.tech.enhanced;
  const m1 = input.m1Scalp;
  const na = input.news;
  const hint = input.suggestedAction ? `Tavsiya: ${input.suggestedAction}` : "";
  const band =
    input.forecastHigh != null && input.forecastLow != null
      ? `Diapazon $${input.forecastLow}–$${input.forecastHigh}`
      : "";
  const levels =
    input.suggestedTp != null
      ? `TP $${input.suggestedTp} SL $${input.suggestedSl}`
      : "";

  return [
    `$${input.price} (${input.changePercent}%)`,
    `M1 ${input.tech.trend} RSI${input.tech.rsi} ADX${input.tech.adx}${e1 ? ` MACD${e1.macdBias}` : ""}`,
    `5m ${input.tech5.trend} RSI${input.tech5.rsi}`,
    `Setup ${input.setupScore} L${input.longScore}/S${input.shortScore}`,
    m1 ? `M1 ${m1.direction} ${m1.strength}% ${m1.phase}` : "",
    `Jonli ${input.live.direction} ${input.live.changeUsd}$`,
    na ? `News ${na.overallBias} ${na.biasStrength}%` : "",
    band,
    levels,
    hint,
    `JSON: action,entry,stopLoss,takeProfit,confidence,riskReward,analysisUz,triggerUz,invalidationUz,summaryUz`,
  ]
    .filter(Boolean)
    .join("\n");
}
