/**
 * Professional AI signal — 8-treyder paneli + gate + struktur + yutish ehtimoli
 */

import type { ChartInterval } from "./chart";
import type { AiTradeSignal } from "./ai-trade-signal";
import type { Candle, NewsMarketAnalysis } from "./types";
import type { PriceImpulse } from "./price-impulse";
import type { JournalStats } from "./platform-insight";
import { computeShortTermStrategy } from "./short-strategy";
import { computeShortMasterSignal } from "./short-master-signal";
import { evaluateMarketRegime } from "./market-regime";
import { getCalendarStatus } from "./economic-calendar";
import { getMarketSession } from "./market-session";
import { analyzeMarketStructure } from "./market-structure";
import { enforceSwingTargets } from "./pip-targets";
import { analyzeTechnicalsFull } from "./enhanced-technical";

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
}

export interface ProAiSignalResult {
  signal: AiTradeSignal;
  master: ReturnType<typeof computeShortMasterSignal>;
  gateAllowed: boolean;
  winProbability: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "WAIT";
  gradeUz: string;
}

function masterDrivenAction(
  master: ReturnType<typeof computeShortMasterSignal>,
  verdictAction: AiTradeSignal["action"]
): AiTradeSignal["action"] {
  if (verdictAction === "BUY" || verdictAction === "SELL") return verdictAction;

  const margin = master.longScore - master.shortScore;
  if (master.bias === "long" && master.longScore >= 44 && margin >= 4) return "BUY";
  if (master.bias === "short" && master.shortScore >= 44 && margin <= -4) return "SELL";
  if (margin >= 8 && master.longScore >= 48) return "BUY";
  if (margin <= -8 && master.shortScore >= 48) return "SELL";
  return "HOLD";
}

function estimateWinProbability(input: {
  confluence: number;
  confidence: number;
  gateAllowed: boolean;
  tfAligned: number;
  tfTotal: number;
  journal?: JournalStats | null;
  masterLong: number;
  masterShort: number;
  bias: "long" | "short" | "wait";
  action: AiTradeSignal["action"];
}): number {
  const margin = Math.abs(input.masterLong - input.masterShort);
  if (input.action === "HOLD" && margin < 6) return 42;

  let p = 46;
  p += input.confluence * 0.26;
  p += input.confidence * 0.14;
  p += input.tfTotal > 0 ? (input.tfAligned / input.tfTotal) * 20 : 0;

  if (margin >= 20) p += 10;
  else if (margin >= 12) p += 6;
  else if (margin >= 6) p += 3;

  if (!input.gateAllowed) p -= 6;

  if (input.journal) {
    const closed = input.journal.wins + input.journal.losses;
    if (closed >= 5) {
      p += (input.journal.last7WinRatePct - 50) * 0.12;
    }
  }

  return Math.min(88, Math.max(38, Math.round(p)));
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

/** Asosiy professional signal — short-strategy + master panel */
export function buildProAiSignal(input: ProAiSignalInput): ProAiSignalResult {
  const { price, multiCandles, drivers, news, impulse, journalStats } = input;

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

  const strategy = computeShortTermStrategy(
    price,
    multiCandles,
    drivers,
    [],
    news,
    impulse,
    journalStats
  );

  const verdict = strategy.verdict;
  const gateAllowed = verdict.gateAllowed;

  const c5 = multiCandles["5m"] ?? multiCandles["1m"] ?? [];
  const structure = c5.length >= 5 ? analyzeMarketStructure(c5, price) : null;

  let action = masterDrivenAction(
    master,
    verdict.action === "BUY" ? "BUY" : verdict.action === "SELL" ? "SELL" : "HOLD"
  );

  let confidence = Math.max(strategy.confidence, master.confidence);
  let entry = verdict.entry ?? price;
  let stopLoss = verdict.stopLoss ?? (action === "SELL" ? price + 3 : price - 3);
  let takeProfit = verdict.takeProfit ?? (action === "SELL" ? price - 5 : price + 5);
  let riskReward = verdict.riskReward ?? 1.2;

  if (action === "BUY" && master.bias === "long") {
    stopLoss = Math.min(stopLoss, price - 2.5);
    takeProfit = Math.max(takeProfit, price + 4);
  } else if (action === "SELL" && master.bias === "short") {
    stopLoss = Math.max(stopLoss, price + 2.5);
    takeProfit = Math.min(takeProfit, price - 4);
  }

  if (action !== "HOLD") {
    const tech5 = analyzeTechnicalsFull(
      c5.length ? c5 : [{ time: 0, open: price, high: price, low: price, close: price }]
    );
    const enforced = enforceSwingTargets(
      {
        action,
        entry: round2(price),
        stopLoss,
        takeProfit,
        confidence,
        riskReward,
        currentPrice: price,
        analysisUz: "",
        triggerUz: "",
        invalidationUz: "",
        summaryUz: "",
        createdAt: new Date().toISOString(),
      },
      price,
      tech5
    );
    const s = enforced.signal;
    action = s.action;
    entry = s.entry;
    stopLoss = s.stopLoss;
    takeProfit = s.takeProfit;
    riskReward = s.riskReward;
    confidence = s.confidence;
  }

  const biasForProb =
    action === "BUY" ? "long" : action === "SELL" ? "short" : master.bias;

  const winProbability = estimateWinProbability({
    confluence: master.confluencePct,
    confidence,
    gateAllowed,
    tfAligned: strategy.tfAligned,
    tfTotal: strategy.tfTotal,
    journal: journalStats,
    masterLong: master.longScore,
    masterShort: master.shortScore,
    bias: biasForProb,
    action,
  });

  const grade = gradeFromWinProb(winProbability, action);

  const analysisUz = [
    master.summaryUz,
    action !== "HOLD" ? strategy.playbookUz : strategy.situationUz,
    structure?.summaryUz ?? "",
    verdict.analysisUz,
    !gateAllowed && action !== "HOLD" ? `⚠ Ehtiyot: ${verdict.reliabilityUz}` : "",
    `Panel L${master.longScore} / S${master.shortScore}`,
    `Sessiya: ${session.nameUz}${session.primeWindow ? " · PRIME" : ""}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 900);

  const summaryUz =
    action === "HOLD"
      ? `KUTING — L${master.longScore} S${master.shortScore} · panel ${master.bias.toUpperCase()}`
      : `${action} · ~${winProbability}% · ${grade} · R:R ${riskReward} · L${master.longScore}/S${master.shortScore}`;

  const signal: AiTradeSignal = {
    action,
    entry: round2(entry),
    stopLoss: round2(stopLoss),
    takeProfit: round2(takeProfit),
    confidence,
    riskReward: round2(riskReward),
    currentPrice: round2(price),
    analysisUz,
    triggerUz:
      action === "HOLD"
        ? master.bias === "long"
          ? `LONG moyil — $${round2(price - 1)} dan yuqori breakout kuting`
          : master.bias === "short"
            ? `SHORT moyil — $${round2(price + 1)} dan past breakout kuting`
            : strategy.entry.whenUz
        : strategy.entry.whenUz,
    invalidationUz: strategy.invalidationUz,
    summaryUz,
    createdAt: new Date().toISOString(),
    forecastHigh: structure?.r1 ?? strategy.keyLevels?.find((k) => k.label.includes("yuqori"))?.price,
    forecastLow: structure?.s1 ?? strategy.keyLevels?.find((k) => k.label.includes("past"))?.price,
    forecastBiasUz:
      master.bias === "long" ? "↑ LONG" : master.bias === "short" ? "↓ SHORT" : "— NEYTRAL",
    targetMoveUsd: round2(Math.abs(takeProfit - entry)),
    winProbability,
    confluencePct: master.confluencePct,
    signalGrade: grade === "WAIT" ? undefined : grade,
    panelUz: master.panelUz,
  };

  return {
    signal,
    master,
    gateAllowed,
    winProbability,
    grade,
    gradeUz: gradeUz(grade),
  };
}
