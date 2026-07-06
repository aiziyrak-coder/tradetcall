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
  grade: "A+" | "A" | "B" | "C" | "D";
  gradeUz: string;
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
}): number {
  if (input.bias === "wait" || !input.gateAllowed) return 38;

  let p = 42;
  p += input.confluence * 0.28;
  p += input.confidence * 0.12;
  p += (input.tfTotal > 0 ? (input.tfAligned / input.tfTotal) * 18 : 0);

  const margin = Math.abs(input.masterLong - input.masterShort);
  if (margin >= 20) p += 8;
  else if (margin >= 12) p += 4;

  if (input.journal) {
    const closed = input.journal.wins + input.journal.losses;
    if (closed >= 5) {
      const wr = input.journal.last7WinRatePct;
      p += (wr - 50) * 0.15;
    }
  }

  return Math.min(88, Math.max(35, Math.round(p)));
}

function gradeFromWinProb(wp: number, gateAllowed: boolean): ProAiSignalResult["grade"] {
  if (!gateAllowed) return "D";
  if (wp >= 72) return "A+";
  if (wp >= 64) return "A";
  if (wp >= 55) return "B";
  if (wp >= 48) return "C";
  return "D";
}

function gradeUz(g: ProAiSignalResult["grade"]): string {
  if (g === "A+") return "A+ — professional setup, yuqori ehtimol";
  if (g === "A") return "A — yaxshi setup, savdo mumkin";
  if (g === "B") return "B — o'rtacha, ehtiyot bilan";
  if (g === "C") return "C — zaif, kichik lot yoki kuting";
  return "D — savdo tavsiya etilmaydi";
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

  let action: AiTradeSignal["action"] =
    verdict.action === "BUY" ? "BUY" : verdict.action === "SELL" ? "SELL" : "HOLD";

  let confidence = strategy.confidence;
  if (!gateAllowed && action !== "HOLD") {
    action = "HOLD";
    confidence = Math.min(confidence, 48);
  }

  let entry = verdict.entry ?? price;
  let stopLoss = verdict.stopLoss ?? price - 3;
  let takeProfit = verdict.takeProfit ?? price + 5;
  let riskReward = verdict.riskReward ?? 1.2;

  if (action !== "HOLD") {
    const tech5 = analyzeTechnicalsFull(c5.length ? c5 : [{ time: 0, open: price, high: price, low: price, close: price }]);
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

  const winProbability = estimateWinProbability({
    confluence: strategy.signal.confluencePct,
    confidence,
    gateAllowed,
    tfAligned: strategy.tfAligned,
    tfTotal: strategy.tfTotal,
    journal: journalStats,
    masterLong: master.longScore,
    masterShort: master.shortScore,
    bias: strategy.bias,
  });

  const grade = gradeFromWinProb(winProbability, gateAllowed);

  if (action !== "HOLD" && (!gateAllowed || winProbability < 56 || grade === "C" || grade === "D")) {
    action = "HOLD";
    confidence = Math.min(confidence, 46);
  }

  const pillarText = master.pillars
    .slice(0, 6)
    .map((p) => `${p.labelUz}: L${p.longPts}/S${p.shortPts}`)
    .join(" · ");

  const analysisUz = [
    master.summaryUz,
    strategy.playbookUz,
    structure?.summaryUz ?? "",
    pillarText,
    verdict.analysisUz,
    gateAllowed ? "" : `GATE: ${verdict.reliabilityUz}`,
    `Panel: ${master.panelUz.slice(0, 120)}`,
    `Sessiya: ${session.nameUz}${session.primeWindow ? " (PRIME)" : ""}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 900);

  const summaryUz =
    action === "HOLD"
      ? `HOLD — L${master.longScore} S${master.shortScore} · ${winProbability}% ehtimol · ${grade}`
      : `${action} — yutish ~${winProbability}% · ${grade} · R:R ${riskReward} · L${master.longScore}/S${master.shortScore}`;

  const signal: AiTradeSignal = {
    action,
    entry: round2(entry),
    stopLoss: round2(stopLoss),
    takeProfit: round2(takeProfit),
    confidence,
    riskReward: round2(riskReward),
    currentPrice: round2(price),
    analysisUz,
    triggerUz: strategy.entry.whenUz,
    invalidationUz: strategy.invalidationUz,
    summaryUz,
    createdAt: new Date().toISOString(),
    forecastHigh: structure?.r1 ?? strategy.keyLevels?.find((k) => k.label.includes("yuqori"))?.price,
    forecastLow: structure?.s1 ?? strategy.keyLevels?.find((k) => k.label.includes("past"))?.price,
    forecastBiasUz: master.bias === "long" ? "LONG moyil" : master.bias === "short" ? "SHORT moyil" : "NEYTRAL",
    targetMoveUsd: round2(Math.abs(takeProfit - entry)),
    winProbability,
    confluencePct: master.confluencePct,
    signalGrade: grade,
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
