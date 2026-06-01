import type { NewsMarketAnalysis } from "./types";
import type { TechnicalAnalysis } from "./types";
import type { M1ScalpLead } from "./m1-scalp";
import type { LiveMomentum } from "./scalp-signal-guard";
import { SWING_MAX_TP_PIPS, SWING_MIN_TP_PIPS } from "./pip-targets";

export const SYSTEM_AI_TRADE_SIGNAL_COMPACT = `XAUUSD qisqa skalp treyderi. FAQAT bitta JSON. TP ${SWING_MIN_TP_PIPS}-${SWING_MAX_TP_PIPS} pip. analysisUz max 2 qisqa jumla. summaryUz 1 jumla.`;

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
}): string {
  const e1 = input.tech.enhanced;
  const m1 = input.m1Scalp;
  const na = input.news;
  const hint = input.suggestedAction ? `Tavsiya: ${input.suggestedAction}` : "";

  return [
    `$${input.price} (${input.changePercent}%)`,
    `M1 ${input.tech.trend} RSI${input.tech.rsi} ADX${input.tech.adx}${e1 ? ` MACD${e1.macdBias}` : ""}`,
    `5m ${input.tech5.trend} RSI${input.tech5.rsi}`,
    `Setup ${input.setupScore} L${input.longScore}/S${input.shortScore}`,
    m1 ? `M1 ${m1.direction} ${m1.strength}% ${m1.phase}` : "",
    `Jonli ${input.live.direction} ${input.live.changeUsd}$`,
    na ? `News ${na.overallBias} ${na.biasStrength}%` : "",
    hint,
    `JSON: action,entry,stopLoss,takeProfit,confidence,riskReward,analysisUz,triggerUz,invalidationUz,summaryUz`,
  ]
    .filter(Boolean)
    .join("\n");
}
