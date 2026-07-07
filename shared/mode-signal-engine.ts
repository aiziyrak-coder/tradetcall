/**
 * Scalp vs Swing — alohida strategiya engine
 * Scalp: M1 momentum, jonli impuls, tor SL/TP
 * Swing: 5m/15m/1h moslik, struktura, yangilik, keng target
 */

import type { ChartInterval } from "./chart";
import type { AiTradeSignal, SignalMode } from "./ai-trade-signal";
import type { Candle, NewsMarketAnalysis } from "./types";
import type { PriceImpulse } from "./price-impulse";
import type { JournalStats } from "./platform-insight";
import { analyzeM1ScalpLead } from "./m1-scalp";
import { analyzeTechnicalsFull } from "./enhanced-technical";
import { analyzeTechnicals } from "./technical";
import { analyzeMarketStructure } from "./market-structure";
import { computeShortTermStrategy } from "./short-strategy";
import { enforceSwingTargets } from "./pip-targets";
import { getLiveMomentum } from "./scalp-signal-guard";
import { getMarketSession } from "./market-session";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface ModeEngineInput {
  price: number;
  multiCandles: Partial<Record<ChartInterval, Candle[]>>;
  drivers: import("./types").MarketQuote[];
  news: NewsMarketAnalysis | null;
  impulse: PriceImpulse | null;
  journalStats?: JournalStats | null;
}

interface ModeBuildResult {
  action: AiTradeSignal["action"];
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  riskReward: number;
  winProbability: number;
  confluencePct: number;
  signalGrade?: string;
  analysisUz: string;
  triggerUz: string;
  invalidationUz: string;
  summaryUz: string;
  panelUz: string;
  forecastHigh?: number;
  forecastLow?: number;
  forecastBiasUz?: string;
  modeLabelUz: string;
  holdTimeUz: string;
}

const SCALP_META = {
  label: "TEZ SAVDO",
  holdTimeUz: "5–20 daqiqa",
};

const SWING_META = {
  label: "1–2 SOAT",
  holdTimeUz: "1–2 soat",
};

/** ── SCALP: M1 + jonli momentum ── */
function buildScalpSignal(input: ModeEngineInput): ModeBuildResult {
  const { price, multiCandles, impulse } = input;
  const c1 = multiCandles["1m"] ?? multiCandles["5m"] ?? [];
  const c5 = multiCandles["5m"] ?? [];
  const fallback: Candle[] = [{ time: 0, open: price, high: price, low: price, close: price }];
  const candles1m = c1.length ? c1 : fallback;

  const m1 = analyzeM1ScalpLead(candles1m, c5, price, impulse);
  const live = getLiveMomentum(candles1m, price);
  const tech1 = analyzeTechnicals(candles1m);

  let action: AiTradeSignal["action"] = "HOLD";
  let confidence = m1.strength;

  // 1) M1 yo'nalish — asosiy manba (exhausted ham kuchli bo'lsa)
  if (m1.direction === "long") {
    if (m1.phase !== "exhausted" || m1.strength >= 35) {
      action = "BUY";
      confidence = Math.max(confidence, m1.phase === "exhausted" ? 48 : 55);
    }
  } else if (m1.direction === "short") {
    if (m1.phase !== "exhausted" || m1.strength >= 35) {
      action = "SELL";
      confidence = Math.max(confidence, m1.phase === "exhausted" ? 48 : 55);
    }
  }

  // 2) Reversal — burilishda tez kirish
  if (action === "HOLD" && m1.phase === "reversal") {
    action = m1.direction === "long" ? "BUY" : m1.direction === "short" ? "SELL" : "HOLD";
    if (action !== "HOLD") confidence = Math.max(confidence, 52);
  }

  // 3) Jonli momentum (past threshold)
  if (action === "HOLD" && live.direction === "up" && live.changeUsd >= 0.12) {
    action = "BUY";
    confidence = Math.max(46, m1.strength);
  } else if (action === "HOLD" && live.direction === "down" && live.changeUsd <= -0.12) {
    action = "SELL";
    confidence = Math.max(46, m1.strength);
  }

  // 4) Impuls
  if (action === "HOLD" && impulse && impulse.moveUsd >= 0.18) {
    action = impulse.direction === "long" ? "BUY" : "SELL";
    confidence = Math.max(44, m1.strength);
  }

  // 5) Forming / range — zaif lean
  if (action === "HOLD" && m1.strength >= 15) {
    if (m1.direction === "long" && (m1.phase === "forming" || m1.phase === "range")) action = "BUY";
    else if (m1.direction === "short" && (m1.phase === "forming" || m1.phase === "range")) action = "SELL";
    if (action !== "HOLD") confidence = Math.max(confidence, 44);
  }

  // 6) EMA cross lean
  if (action === "HOLD" && tech1.trend === "bullish") {
    action = "BUY";
    confidence = Math.max(42, m1.strength);
  } else if (action === "HOLD" && tech1.trend === "bearish") {
    action = "SELL";
    confidence = Math.max(42, m1.strength);
  }

  // Targetlar — M1 scalp hintlari (tor)
  let entry = round2(m1.entryHint || price);
  let stopLoss = round2(m1.stopHint);
  let takeProfit = round2(m1.tpHint);
  const risk = Math.abs(entry - stopLoss) || 2;
  const reward = Math.abs(takeProfit - entry) || 3;
  let riskReward = round2(reward / risk);

  if (action === "BUY") {
    entry = round2(price);
    stopLoss = round2(m1.stopHint < price ? m1.stopHint : price - 1.8);
    takeProfit = round2(m1.tpHint > price ? m1.tpHint : price + 2.8);
  } else if (action === "SELL") {
    entry = round2(price);
    stopLoss = round2(m1.stopHint > price ? m1.stopHint : price + 1.8);
    takeProfit = round2(m1.tpHint < price ? m1.tpHint : price - 2.8);
  }

  riskReward = round2(Math.abs(takeProfit - entry) / Math.max(0.5, Math.abs(entry - stopLoss)));

  const wp = Math.min(82, Math.max(42, Math.round(confidence * 0.85 + (action !== "HOLD" ? 8 : 0))));
  const grade = wp >= 68 ? "A" : wp >= 58 ? "B" : wp >= 48 ? "C" : "D";

  const triggerUz =
    action === "HOLD"
      ? `M1 kutish — ${m1.phase === "range" ? "breakout" : m1.structureUz}`
      : `${m1.emaCrossUz} · ${live.summaryUz}`;

  const invalidationUz =
    action === "BUY"
      ? `$${stopLoss} ostida yopilsa — bekor`
      : action === "SELL"
        ? `$${stopLoss} ustida yopilsa — bekor`
        : "—";

  return {
    action,
    entry,
    stopLoss,
    takeProfit,
    confidence,
    riskReward,
    winProbability: wp,
    confluencePct: Math.min(95, m1.strength),
    signalGrade: action === "HOLD" ? undefined : grade,
    analysisUz: [
      `⚡ TEZ SAVDO (M1 skalp)`,
      m1.summaryUz,
      live.summaryUz,
      impulse ? `Impuls: ${impulse.direction} $${impulse.moveUsd}` : "",
      `RSI ${tech1.rsi} · ADX ${tech1.adx} · ATR $${tech1.atr}`,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 900),
    triggerUz,
    invalidationUz,
    summaryUz:
      action === "HOLD"
        ? `KUTING · M1 ${m1.direction} · ${m1.phase}`
        : `${action} · ~${wp}% · ${grade} · R:R ${riskReward} · M1 ${m1.strength}%`,
    panelUz: `M1 ${m1.direction.toUpperCase()} ${m1.strength}% · ${m1.phase}`,
    forecastHigh: takeProfit > price ? takeProfit : price + 3,
    forecastLow: takeProfit < price ? takeProfit : price - 3,
    forecastBiasUz: action === "BUY" ? "↑ LONG" : action === "SELL" ? "↓ SHORT" : "—",
    modeLabelUz: SCALP_META.label,
    holdTimeUz: SCALP_META.holdTimeUz,
  };
}

/** TF ovoz — swing uchun 1m hisobga olinmaydi */
function swingTfScores(multiCandles: Partial<Record<ChartInterval, Candle[]>>, price: number) {
  const weights: Record<string, number> = { "5m": 2.2, "15m": 3.5, "1h": 2.8 };
  let longPts = 0;
  let shortPts = 0;
  let aligned = 0;
  let total = 0;

  for (const tf of ["5m", "15m", "1h"] as ChartInterval[]) {
    const candles = multiCandles[tf];
    if (!candles?.length) continue;
    const tech = analyzeTechnicals(candles);
    const w = weights[tf] ?? 1;
    total += w;
    if (tech.trend === "bullish" || tech.rsi > 52) {
      longPts += w * 20;
      if (tech.trend === "bullish") aligned++;
    }
    if (tech.trend === "bearish" || tech.rsi < 48) {
      shortPts += w * 20;
      if (tech.trend === "bearish") aligned++;
    }
    if (price > tech.sma20 && tech.sma20 > tech.sma50) longPts += w * 8;
    if (price < tech.sma20 && tech.sma20 < tech.sma50) shortPts += w * 8;
  }

  return { longPts, shortPts, aligned, total: Math.max(1, total) };
}

/** ── SWING: 5m/15m/1h + yangilik + struktura ── */
function buildSwingSignal(input: ModeEngineInput): ModeBuildResult {
  const { price, multiCandles, drivers, news, impulse, journalStats } = input;
  const c5 = multiCandles["5m"] ?? multiCandles["15m"] ?? [];
  const c15 = multiCandles["15m"] ?? c5;
  const fallback: Candle[] = [{ time: 0, open: price, high: price, low: price, close: price }];

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
  const tf = swingTfScores(multiCandles, price);
  const structure = c15.length >= 8 ? analyzeMarketStructure(c15, price) : null;
  const tech5 = analyzeTechnicalsFull(c5.length ? c5 : fallback);
  const session = getMarketSession();

  const margin = tf.longPts - tf.shortPts;
  let action: AiTradeSignal["action"] = "HOLD";

  // 1) Strategiya verdict
  if (verdict.action === "BUY" || verdict.action === "SELL") {
    action = verdict.action;
  }

  // 2) TF moslik (15m/1h ustun)
  if (action === "HOLD") {
    if (margin >= 25 && tf.aligned >= 1) action = "BUY";
    else if (margin <= -25 && tf.aligned >= 1) action = "SELL";
  }

  // 3) Yangiliklar (swing uchun muhim)
  if (action === "HOLD" && news) {
    if (news.overallBias === "bullish" && news.biasStrength >= 58 && margin >= 5) action = "BUY";
    else if (news.overallBias === "bearish" && news.biasStrength >= 58 && margin <= -5) action = "SELL";
  }

  // 4) Struktura darajalari
  if (action === "HOLD" && structure) {
    if (structure.trend === "bullish" && margin >= 0) action = "BUY";
    else if (structure.trend === "bearish" && margin <= 0) action = "SELL";
  }

  // 5) Yumshoq lean (swing uchun past threshold)
  if (action === "HOLD" && Math.abs(margin) >= 8) {
    action = margin > 0 ? "BUY" : "SELL";
  }

  let confidence = Math.max(strategy.confidence, Math.min(88, 50 + Math.abs(margin)));
  let entry = round2(verdict.entry ?? price);
  let stopLoss = round2(verdict.stopLoss ?? (action === "SELL" ? price + 5 : price - 5));
  let takeProfit = round2(verdict.takeProfit ?? (action === "SELL" ? price - 9 : price + 9));
  let riskReward = verdict.riskReward ?? 1.8;

  if (action !== "HOLD") {
    const atr = Math.max(3, Math.min(10, tech5.atr || 5));
    const slDist = Math.max(4, atr * 1.1);
    const tpDist = Math.max(8, slDist * 2);

    entry = round2(price);
    if (action === "BUY") {
      stopLoss = round2(structure?.s1 ?? price - slDist);
      takeProfit = round2(structure?.r1 ?? price + tpDist);
      if (takeProfit - entry < 6) takeProfit = round2(entry + tpDist);
    } else {
      stopLoss = round2(structure?.r1 ?? price + slDist);
      takeProfit = round2(structure?.s1 ?? price - tpDist);
      if (entry - takeProfit < 6) takeProfit = round2(entry - tpDist);
    }

    const enforced = enforceSwingTargets(
      {
        action,
        entry,
        stopLoss,
        takeProfit,
        confidence,
        riskReward: 2,
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

    // Rad etilsa ham — keng target bilan savdo
    if (enforced.rejected && margin !== 0) {
      action = margin > 0 ? "BUY" : "SELL";
      entry = round2(price);
      stopLoss = action === "BUY" ? round2(price - 4) : round2(price + 4);
      takeProfit = action === "BUY" ? round2(price + 10) : round2(price - 10);
      riskReward = 2.5;
      confidence = Math.max(confidence, 58);
    }
  }

  const confluence = Math.min(
    95,
    Math.round((tf.aligned / 3) * 40 + Math.abs(margin) * 0.5 + (news?.biasStrength ?? 50) * 0.2)
  );

  const wp = Math.min(
    88,
    Math.max(
      44,
      Math.round(
        confluence * 0.35 +
          confidence * 0.25 +
          (verdict.gateAllowed ? 12 : 4) +
          (action !== "HOLD" ? 10 : 0)
      )
    )
  );

  const grade =
    action === "HOLD" ? undefined : wp >= 72 ? "A+" : wp >= 64 ? "A" : wp >= 54 ? "B" : "C";

  const triggerUz =
    action === "HOLD"
      ? strategy.entry.whenUz
      : `${strategy.entry.whenUz} · TF moslik ${tf.aligned}/3`;

  return {
    action,
    entry,
    stopLoss,
    takeProfit,
    confidence,
    riskReward: round2(riskReward),
    winProbability: wp,
    confluencePct: confluence,
    signalGrade: grade,
    analysisUz: [
      `◷ SWING (1–2 soat)`,
      strategy.playbookUz || strategy.situationUz,
      structure?.summaryUz ?? "",
      verdict.analysisUz,
      news ? `Yangilik: ${news.overallBias} ${news.biasStrength}%` : "",
      `TF L${Math.round(tf.longPts)} / S${Math.round(tf.shortPts)} · moslik ${tf.aligned}/3`,
      `Sessiya: ${session.nameUz}`,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 900),
    triggerUz,
    invalidationUz: strategy.invalidationUz,
    summaryUz:
      action === "HOLD"
        ? `KUTING · TF L${Math.round(tf.longPts)} · S${Math.round(tf.shortPts)}`
        : `${action} · ~${wp}% · ${grade} · R:R ${round2(riskReward)} · TF ${tf.aligned}/3`,
    panelUz: `SWING L${Math.round(tf.longPts)} / S${Math.round(tf.shortPts)} · ${news?.overallBias ?? "—"}`,
    forecastHigh: structure?.r1 ?? takeProfit,
    forecastLow: structure?.s1 ?? stopLoss,
    forecastBiasUz:
      margin > 5 ? "↑ LONG" : margin < -5 ? "↓ SHORT" : news?.overallBias === "bullish" ? "↑ LONG" : "↓ SHORT",
    modeLabelUz: SWING_META.label,
    holdTimeUz: SWING_META.holdTimeUz,
  };
}

/** Rejim bo'yicha signal qurish */
export function buildModeSignal(
  mode: SignalMode,
  input: ModeEngineInput
): ModeBuildResult {
  return mode === "scalp" ? buildScalpSignal(input) : buildSwingSignal(input);
}
