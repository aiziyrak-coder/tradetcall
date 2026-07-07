/**
 * Professional AI signal — rejim bo'yicha (scalp / swing) alohida engine
 */

import type { ChartInterval } from "./chart";
import type { AiTradeSignal, SignalMode } from "./ai-trade-signal";
import type { Candle, NewsMarketAnalysis } from "./types";
import type { PriceImpulse } from "./price-impulse";
import type { JournalStats } from "./platform-insight";
import { buildModeSignal } from "./mode-signal-engine";
import { computeShortMasterSignal } from "./short-master-signal";
import { evaluateMarketRegime } from "./market-regime";
import { getCalendarStatus } from "./economic-calendar";
import { getMarketSession } from "./market-session";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface ProAiSignalInput {
  price: number;
  multiCandles: Partial<Record<ChartInterval, Candle[]>>;
  drivers: import("./types").MarketQuote[];
  news: NewsMarketAnalysis | null;
  impulse: PriceImpulse | null;
  journalStats?: JournalStats | null;
  mode?: SignalMode;
}

export interface ProAiSignalResult {
  signal: AiTradeSignal;
  master: ReturnType<typeof computeShortMasterSignal>;
  gateAllowed: boolean;
  winProbability: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "WAIT";
  gradeUz: string;
}

function gradeFromWinProb(
  wp: number,
  action: AiTradeSignal["action"]
): ProAiSignalResult["grade"] {
  if (action === "HOLD") return "WAIT";
  if (wp >= 72) return "A+";
  if (wp >= 64) return "A";
  if (wp >= 54) return "B";
  if (wp >= 46) return "C";
  return "D";
}

function gradeUz(g: ProAiSignalResult["grade"]): string {
  if (g === "WAIT") return "Kutish — aniq kirish yo'q";
  if (g === "A+") return "A+ — professional setup";
  if (g === "A") return "A — yaxshi setup";
  if (g === "B") return "B — ehtiyot bilan";
  if (g === "C") return "C — zaif setup";
  return "D — kirmang";
}

/** Asosiy professional signal — scalp yoki swing engine */
export function buildProAiSignal(input: ProAiSignalInput): ProAiSignalResult {
  const { price, multiCandles, drivers, news, impulse, journalStats } = input;
  const mode: SignalMode = input.mode ?? "swing";

  const regime = evaluateMarketRegime(drivers);
  const calendar = getCalendarStatus();
  const session = getMarketSession();

  const master = computeShortMasterSignal({
    price,
    multiCandles,
    drivers,
    news,
    regime,
    calendar,
    session,
    impulse,
  });

  const built = buildModeSignal(mode, {
    price,
    multiCandles,
    drivers,
    news,
    impulse,
    journalStats,
  });

  const grade = gradeFromWinProb(built.winProbability, built.action);
  const gateAllowed = built.action !== "HOLD";

  const signal: AiTradeSignal = {
    action: built.action,
    entry: round2(built.entry),
    stopLoss: round2(built.stopLoss),
    takeProfit: round2(built.takeProfit),
    confidence: built.confidence,
    riskReward: round2(built.riskReward),
    currentPrice: round2(price),
    analysisUz: built.analysisUz,
    triggerUz: built.triggerUz,
    invalidationUz: built.invalidationUz,
    summaryUz: built.summaryUz,
    createdAt: new Date().toISOString(),
    forecastHigh: built.forecastHigh,
    forecastLow: built.forecastLow,
    forecastBiasUz: built.forecastBiasUz,
    targetMoveUsd: round2(Math.abs(built.takeProfit - built.entry)),
    winProbability: built.winProbability,
    confluencePct: built.confluencePct,
    signalGrade: built.signalGrade,
    panelUz: built.panelUz,
    mode,
    modeLabelUz: built.modeLabelUz,
    holdTimeUz: built.holdTimeUz,
    indicatorsUz: built.topVotes?.map((v) => `${v.labelUz} · ${v.strength}%`),
  };

  return {
    signal,
    master,
    gateAllowed,
    winProbability: built.winProbability,
    grade,
    gradeUz: gradeUz(grade),
  };
}
