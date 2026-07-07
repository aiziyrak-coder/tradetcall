/**
 * Professional AI signal — 8-treyder paneli + gate + struktur + yutish ehtimoli
 */

import type { ChartInterval } from "./chart";
import type { AiTradeSignal, SignalMode } from "./ai-trade-signal";
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
  /** scalp = tez, swing = 1–2 soat. Default swing */
  mode?: SignalMode;
}

interface ModeConfig {
  label: string;
  holdTimeUz: string;
  /** Kuchli signal uchun kerakli margin */
  strongMargin: number;
  /** Bias yo'nalishi uchun minimal margin */
  biasMargin: number;
  /** Eng kichik yo'nalish (lean) margini */
  leanMargin: number;
  /** Minimal longScore/shortScore */
  minScore: number;
  /** SL masofasi ($) */
  slUsd: number;
  /** Maqsad R:R */
  targetRr: number;
}

const MODE_CONFIG: Record<SignalMode, ModeConfig> = {
  scalp: {
    label: "TEZ SAVDO",
    holdTimeUz: "5–20 daqiqa",
    strongMargin: 6,
    biasMargin: 1,
    leanMargin: 1,
    minScore: 32,
    slUsd: 2,
    targetRr: 1.5,
  },
  swing: {
    label: "1–2 SOAT",
    holdTimeUz: "1–2 soat",
    strongMargin: 12,
    biasMargin: 3,
    leanMargin: 2,
    minScore: 38,
    slUsd: 4,
    targetRr: 1.8,
  },
};

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
  verdictAction: AiTradeSignal["action"],
  cfg: ModeConfig
): AiTradeSignal["action"] {
  if (verdictAction === "BUY" || verdictAction === "SELL") return verdictAction;

  const margin = master.longScore - master.shortScore;
  const strong = cfg.strongMargin;
  const half = Math.round(strong / 2);

  if (margin >= strong && master.longScore >= cfg.minScore + 6) return "BUY";
  if (margin <= -strong && master.shortScore >= cfg.minScore + 6) return "SELL";
  if (master.bias === "long" && master.longScore >= cfg.minScore && margin >= cfg.biasMargin) return "BUY";
  if (master.bias === "short" && master.shortScore >= cfg.minScore && margin <= -cfg.biasMargin) return "SELL";
  if (margin >= half && master.longScore >= cfg.minScore + 4) return "BUY";
  if (margin <= -half && master.shortScore >= cfg.minScore + 4) return "SELL";

  // Yumshoq lean — kichik margin bo'lsa ham yo'nalish tanlanadi
  if (margin >= cfg.leanMargin && master.longScore >= cfg.minScore - 4) return "BUY";
  if (margin <= -cfg.leanMargin && master.shortScore >= cfg.minScore - 4) return "SELL";

  // Bias asosida oxirgi imkoniyat (yo'nalishga qarshi emas)
  if (master.bias === "long" && margin >= 0 && master.longScore >= cfg.minScore - 8) return "BUY";
  if (master.bias === "short" && margin <= 0 && master.shortScore >= cfg.minScore - 8) return "SELL";

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
  const mode: SignalMode = input.mode ?? "swing";
  const cfg = MODE_CONFIG[mode];

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
    verdict.action === "BUY" ? "BUY" : verdict.action === "SELL" ? "SELL" : "HOLD",
    cfg
  );

  if (action === "HOLD" && news) {
    const margin = master.longScore - master.shortScore;
    const newsMargin = mode === "scalp" ? 0 : 4;
    const newsStrength = mode === "scalp" ? 52 : 62;
    if (news.overallBias === "bullish" && news.biasStrength >= newsStrength && margin >= newsMargin) action = "BUY";
    else if (news.overallBias === "bearish" && news.biasStrength >= newsStrength && margin <= -newsMargin) action = "SELL";
  }

  // Jonli impuls yo'nalishi bo'lsa, kichik margin bilan ham kirish
  if (action === "HOLD" && impulse && impulse.moveUsd >= (mode === "scalp" ? 0.3 : 0.5)) {
    const margin = master.longScore - master.shortScore;
    const dir = impulse.direction;
    if (dir === "long" && margin >= -2 && master.longScore >= cfg.minScore - 8) action = "BUY";
    else if (dir === "short" && margin <= 2 && master.shortScore >= cfg.minScore - 8) action = "SELL";
  }

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

  if (action !== "HOLD" && mode === "scalp") {
    // Tez skalping — tor SL/TP, jonli ATR asosida
    const tech1 = analyzeTechnicalsFull(
      (multiCandles["1m"] ?? c5).length
        ? (multiCandles["1m"] ?? c5)
        : [{ time: 0, open: price, high: price, low: price, close: price }]
    );
    const atr = Math.max(0.8, Math.min(3.5, tech1.atr || 1.5));
    const slDist = Math.max(1.2, Math.min(cfg.slUsd, atr));
    const tpDist = slDist * cfg.targetRr;
    entry = round2(price);
    stopLoss = action === "BUY" ? round2(price - slDist) : round2(price + slDist);
    takeProfit = action === "BUY" ? round2(price + tpDist) : round2(price - tpDist);
    riskReward = round2(cfg.targetRr);
  } else if (action !== "HOLD") {
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

    const margin = master.longScore - master.shortScore;
    if (enforced.rejected) {
      // Joy tor bo'lsa ham — minimal target bilan savdo (HOLD emas)
      action = margin >= 0 ? "BUY" : "SELL";
      entry = round2(price);
      stopLoss = action === "BUY" ? round2(price - 3) : round2(price + 3);
      takeProfit = action === "BUY" ? round2(price + 5) : round2(price - 5);
      riskReward = 1.67;
      confidence = Math.max(confidence, 58);
    } else {
      const s = enforced.signal;
      action = s.action;
      entry = s.entry;
      stopLoss = s.stopLoss;
      takeProfit = s.takeProfit;
      riskReward = s.riskReward;
      confidence = s.confidence;
    }
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
      ? `KUTING · L${master.longScore} · S${master.shortScore} · ${master.bias.toUpperCase()}`
      : `${action} · ~${winProbability}% · ${grade} · R:R ${riskReward} · L${master.longScore} · S${master.shortScore}`;

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
    mode,
    modeLabelUz: cfg.label,
    holdTimeUz: cfg.holdTimeUz,
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
