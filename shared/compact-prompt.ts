import type { NewsMarketAnalysis } from "./types";
import type { TechnicalAnalysis } from "./types";
import type { M1ScalpLead } from "./m1-scalp";
import type { LiveMomentum } from "./scalp-signal-guard";
import { formatLiveMomentumForAi } from "./scalp-signal-guard";
import { formatSwingTargetsForAi } from "./pip-targets";

export { SYSTEM_AI_EMPIRE_MANIFEST as SYSTEM_AI_TRADE_SIGNAL_COMPACT } from "./ai-manifest";

export function buildCompactAiTradeSignalPrompt(input: {
  price: number;
  changePercent: number;
  high24h?: number;
  low24h?: number;
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
  disciplineScore?: number;
  capitalShieldOk?: boolean;
  calendarHint?: string;
  drivers?: { name: string; changePercent: number }[];
  newsTitles?: string[];
}): string {
  const e1 = input.tech.enhanced;
  const m1 = input.m1Scalp;
  const na = input.news;
  const hint = input.suggestedAction ? `Model tavsiyasi: ${input.suggestedAction}` : "";
  const band =
    input.forecastHigh != null && input.forecastLow != null
      ? `Bashorat diapazoni: $${input.forecastLow} – $${input.forecastHigh}`
      : "";
  const levels =
    input.suggestedTp != null
      ? `Model TP $${input.suggestedTp} · SL $${input.suggestedSl}`
      : "";

  const newsBlock = na
    ? [
        `Yangiliklar: ${na.overallBias} ${na.biasStrength}% (ishonch ${na.confidence}%)`,
        na.tradeVerdictUz ?? na.recommendationUz ?? "",
        na.contradictionsUz ? `ZIDLIK: ${na.contradictionsUz}` : "",
        na.aiDiscussionUz?.slice(0, 300) ?? "",
      ]
        .filter(Boolean)
        .join("\n")
    : "Yangiliklar: tahlil yo'q";

  const titles =
    input.newsTitles?.slice(0, 12).map((t, i) => `${i + 1}. ${t}`).join("\n") ?? "";

  const drivers =
    input.drivers?.map((d) => `${d.name} ${d.changePercent}%`).join(" · ") ?? "—";

  return [
    `=== XAUUSD PROGNOZ ===`,
    `NARX: $${input.price} (${input.changePercent}%)`,
    input.high24h != null ? `24s: $${input.low24h} – $${input.high24h}` : "",
    "",
    `=== TEXNIK M1 ===`,
    `Trend: ${input.tech.trend} | RSI ${input.tech.rsi} | ADX ${input.tech.adx} | ATR $${input.tech.atr}`,
    e1 ? `MACD: ${e1.macdBias} | Trend kuchi: ${e1.trendStrength}%` : "",
    `Qo'llab: ${input.tech.support.slice(0, 3).join(", ") || "—"}`,
    `Qarshilik: ${input.tech.resistance.slice(0, 3).join(", ") || "—"}`,
    input.tech.momentum,
    "",
    `=== TEXNIK M5 ===`,
    `Trend: ${input.tech5.trend} | RSI ${input.tech5.rsi} | ADX ${input.tech5.adx}`,
    "",
    `=== SETUP ===`,
    `Ball: ${input.setupScore}/100 | Long ${input.longScore} | Short ${input.shortScore}`,
    input.disciplineScore != null ? `Qoidalar: ${input.disciplineScore}/100` : "",
    input.capitalShieldOk === false ? "⚠ Kapital himoyasi: ehtiyot" : "",
    "",
    m1 ? `=== M1 SKALP ===\n${m1.direction} ${m1.strength}% | ${m1.phase}` : "",
    "",
    formatLiveMomentumForAi(input.live, input.changePercent),
    "",
    formatSwingTargetsForAi(input.price, input.tech),
    "",
    `=== YANGILIKLAR ===`,
    newsBlock,
    titles ? `\nSarlavhalar:\n${titles}` : "",
    "",
    `=== KONTEKST ===`,
    `Driverlar: ${drivers}`,
    input.calendarHint ? `Kalendar: ${input.calendarHint}` : "",
    band,
    levels,
    hint,
    "",
    `JSON: {"action","entry","stopLoss","takeProfit","confidence","riskReward","analysisUz","triggerUz","invalidationUz","summaryUz"}`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}
