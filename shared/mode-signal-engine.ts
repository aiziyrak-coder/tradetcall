/**
 * Scalp vs Swing — BUTUNLAY ALOHIDA strategiya va indikator to'plami
 *
 * ⚡ SCALP (TEZ SAVDO): tez momentum + mikro-reversion
 *   computeScalpConfluence — EMA 8/20, RSI(7), Stochastic, ROC(4),
 *   price-action mikro-struktura, breakout, VWAP, Bollinger + M1 lead + jonli impuls.
 *   1m+5m, tor SL/TP, 5–20 daqiqa.
 *
 * ◷ SWING (UZOQ MUDDAT): trend-following + struktura
 *   computeConfluence — EMA 50/200, Supertrend, MACD, ADX/DMI, Ichimoku,
 *   Donchian, RSI(14), swing struktura (HH/HL) — 15m/1h/4h/1d MTF.
 *   Keng target, 4–24 soat.
 */

import type { ChartInterval } from "./chart";
import type { AiTradeSignal, SignalMode } from "./ai-trade-signal";
import type { Candle, NewsMarketAnalysis } from "./types";
import type { PriceImpulse } from "./price-impulse";
import type { JournalStats } from "./platform-insight";
import { analyzeM1ScalpLead } from "./m1-scalp";
import { analyzeTechnicalsFull } from "./enhanced-technical";
import { analyzeMarketStructure } from "./market-structure";
import { computeShortTermStrategy } from "./short-strategy";
import { getLiveMomentum } from "./scalp-signal-guard";
import { getMarketSession } from "./market-session";
import {
  computeConfluence,
  computeScalpConfluence,
  computeMtfConfluence,
  aggregateCandles,
  type IndicatorVote,
} from "./indicator-confluence";

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
  /** Signal asosini tashkil qilgan eng kuchli indikatorlar */
  topVotes?: IndicatorVote[];
}

const SCALP_META = {
  label: "TEZ SAVDO",
  holdTimeUz: "5–20 daqiqa",
};

const SWING_META = {
  label: "UZOQ MUDDAT",
  holdTimeUz: "4–24 soat",
};

/** ── SCALP: tez intraday confluence (8 tez indikator) + M1 + jonli momentum ── */
function buildScalpSignal(input: ModeEngineInput): ModeBuildResult {
  const { price, multiCandles, impulse } = input;
  const fallback: Candle[] = [{ time: 0, open: price, high: price, low: price, close: price }];
  const c1 = (multiCandles["1m"]?.length ? multiCandles["1m"] : multiCandles["5m"]) ?? fallback;
  const c5 = multiCandles["5m"]?.length ? multiCandles["5m"] : c1;

  const m1 = analyzeM1ScalpLead(c1, c5, price, impulse);
  const live = getLiveMomentum(c1, price);

  // Tez SCALP confluence — intraday indikatorlar (1m ustun, 5m tasdiq)
  const conf1 = computeScalpConfluence(c1.length >= 6 ? c1 : fallback);
  const conf5 = computeScalpConfluence(c5.length >= 6 ? c5 : fallback);
  const w1 = 1.7;
  const w5 = 1.1;
  const longScore = Math.round((conf1.longScore * w1 + conf5.longScore * w5) / (w1 + w5));
  const shortScore = Math.round((conf1.shortScore * w1 + conf5.shortScore * w5) / (w1 + w5));
  const score = longScore - shortScore;
  const aligned =
    (conf1.bias === "long" ? 1 : 0) +
    (conf5.bias === "long" ? 1 : 0) -
    (conf1.bias === "short" ? 1 : 0) -
    (conf5.bias === "short" ? 1 : 0);

  let action: AiTradeSignal["action"] = "HOLD";
  let confidence = Math.max(m1.strength, Math.abs(score));

  // 1) Confluence — asosiy manba
  if (score >= 8) {
    action = "BUY";
    confidence = Math.max(confidence, 55 + Math.min(score, 30) * 0.5);
  } else if (score <= -8) {
    action = "SELL";
    confidence = Math.max(confidence, 55 + Math.min(-score, 30) * 0.5);
  }

  // 2) M1 skalp lead — tez yo'nalish
  if (action === "HOLD" && m1.direction === "long" && m1.phase !== "exhausted") {
    action = "BUY";
    confidence = Math.max(confidence, 52);
  } else if (action === "HOLD" && m1.direction === "short" && m1.phase !== "exhausted") {
    action = "SELL";
    confidence = Math.max(confidence, 52);
  }

  // 3) Reversal / jonli momentum / impuls
  if (action === "HOLD" && m1.phase === "reversal" && m1.direction !== "neutral") {
    action = m1.direction === "long" ? "BUY" : "SELL";
    confidence = Math.max(confidence, 50);
  }
  if (action === "HOLD" && live.direction === "up" && live.changeUsd >= 0.12) action = "BUY";
  else if (action === "HOLD" && live.direction === "down" && live.changeUsd <= -0.12) action = "SELL";
  if (action === "HOLD" && impulse && impulse.moveUsd >= 0.18) {
    action = impulse.direction === "long" ? "BUY" : "SELL";
  }

  // 4) Oxirgi lean — confluence yo'nalishi (kichik bo'lsa ham)
  if (action === "HOLD" && Math.abs(score) >= 3) {
    action = score > 0 ? "BUY" : "SELL";
    confidence = Math.max(confidence, 44);
  }
  if (action === "HOLD" && m1.direction !== "neutral") {
    action = m1.direction === "long" ? "BUY" : "SELL";
    confidence = Math.max(confidence, 42);
  }

  // Targetlar — M1 hintlari, tor SL/TP (ATR mos)
  const atr1 = Math.max(0.8, Math.min(4, conf1.atr || 1.5));
  let entry = round2(price);
  let stopLoss = round2(price - atr1 * 1.1);
  let takeProfit = round2(price + atr1 * 2);

  if (action === "BUY") {
    entry = round2(price);
    stopLoss = round2(m1.stopHint < price && price - m1.stopHint < 4 ? m1.stopHint : price - atr1 * 1.1);
    takeProfit = round2(m1.tpHint > price && m1.tpHint - price < 8 ? m1.tpHint : price + atr1 * 2);
  } else if (action === "SELL") {
    entry = round2(price);
    stopLoss = round2(m1.stopHint > price && m1.stopHint - price < 4 ? m1.stopHint : price + atr1 * 1.1);
    takeProfit = round2(m1.tpHint < price && price - m1.tpHint < 8 ? m1.tpHint : price - atr1 * 2);
  }

  const riskReward = round2(Math.abs(takeProfit - entry) / Math.max(0.5, Math.abs(entry - stopLoss)));

  const confluencePct = Math.max(conf1.strength, Math.round((conf1.strength + conf5.strength) / 2));
  // Haqqoniy, o'zgaruvchan yutish ehtimoli — kelishmovchilik va shovqin jazolanadi
  const biasSig = action === "BUY" ? "long" : action === "SELL" ? "short" : "neutral";
  const conVotes1 =
    action === "HOLD"
      ? 0
      : conf1.votes.filter((v) => v.signal !== "neutral" && v.signal !== biasSig).length;
  let wp = 50 + Math.abs(score) * 0.5 + Math.max(0, aligned) * 3 + m1.strength * 0.1 - conVotes1 * 2.2;
  // Jonli narx signalga qarshi bo'lsa jazolash
  if (action === "BUY" && live.direction === "down") wp -= 6;
  if (action === "SELL" && live.direction === "up") wp -= 6;
  if (conf1.bias === "neutral" && m1.phase === "range") wp -= 7;
  if (live.direction === "flat" && Math.abs(score) < 6) wp -= 4;
  wp = Math.round(Math.min(86, Math.max(40, wp)));
  const grade = wp >= 76 ? "A+" : wp >= 68 ? "A" : wp >= 58 ? "B" : wp >= 50 ? "C" : "D";

  const topVotes = conf1.votes
    .filter((v) => v.signal === (action === "BUY" ? "long" : action === "SELL" ? "short" : v.signal))
    .sort((a, b) => b.strength * b.weight - a.strength * a.weight)
    .slice(0, 5);

  const triggerUz =
    action === "HOLD"
      ? `Kutish — 1m confluence neytral (L${longScore}/S${shortScore})`
      : `${conf1.summaryUz} · ${live.summaryUz}`;

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
    confidence: Math.round(confidence),
    riskReward,
    winProbability: wp,
    confluencePct,
    signalGrade: action === "HOLD" ? undefined : grade,
    analysisUz: [
      `⚡ TEZ SAVDO — tez momentum + mikro-reversion strategiyasi`,
      `Indikatorlar: EMA 8/20, RSI(7), Stochastic, ROC(4), price-action, breakout, VWAP, Bollinger`,
      `1m: ${conf1.summaryUz}`,
      `5m: ${conf5.summaryUz}`,
      m1.summaryUz,
      live.summaryUz,
      impulse ? `Impuls: ${impulse.direction} $${impulse.moveUsd}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 900),
    triggerUz,
    invalidationUz,
    summaryUz:
      action === "HOLD"
        ? `KUTING · tez confluence L${longScore}/S${shortScore}`
        : `${action} · ~${wp}% · ${grade} · R:R ${riskReward} · ${Math.max(conf1.agree, 0)}/8 tez indikator`,
    panelUz: `1m L${conf1.longScore}/S${conf1.shortScore} · 5m ${conf5.bias} · M1 ${m1.direction}`,
    forecastHigh: takeProfit > price ? takeProfit : price + atr1 * 2,
    forecastLow: takeProfit < price ? takeProfit : price - atr1 * 2,
    forecastBiasUz: action === "BUY" ? "↑ LONG" : action === "SELL" ? "↓ SHORT" : "—",
    modeLabelUz: SCALP_META.label,
    holdTimeUz: SCALP_META.holdTimeUz,
    topVotes,
  };
}

/** ── UZOQ MUDDAT: 15m/1h/4h/1d MTF confluence (haqiqiy uzoq strategiya) ── */
function buildSwingSignal(input: ModeEngineInput): ModeBuildResult {
  const { price, multiCandles, drivers, news, impulse, journalStats } = input;
  const fallback: Candle[] = [{ time: 0, open: price, high: price, low: price, close: price }];
  const c15 = multiCandles["15m"] ?? multiCandles["5m"] ?? [];
  const c1h = multiCandles["1h"] ?? c15;
  const c4h = c1h.length >= 8 ? aggregateCandles(c1h, 4) : c1h;
  const c1d = c1h.length >= 24 ? aggregateCandles(c1h, 24) : c4h;

  // MTF confluence — yuqori TF ustun (uzoq muddat)
  const mtf = computeMtfConfluence([
    { tf: "15m", weight: 1.0, candles: c15 },
    { tf: "1h", weight: 2.0, candles: c1h },
    { tf: "4h", weight: 3.0, candles: c4h },
    { tf: "1d", weight: 2.5, candles: c1d },
  ]);

  // Swing 1m ni hisobga olmaydi — narrativ uchun strategiya
  const swingCandles: Partial<Record<ChartInterval, Candle[]>> = { ...multiCandles };
  delete swingCandles["1m"];
  const strategy = computeShortTermStrategy(price, swingCandles, drivers, [], news, impulse, journalStats);
  const structure = c1h.length >= 8 ? analyzeMarketStructure(c1h, price) : c15.length >= 8 ? analyzeMarketStructure(c15, price) : null;
  const tech1h = analyzeTechnicalsFull(c1h.length ? c1h : fallback);
  const session = getMarketSession();

  const score = mtf.score;
  let action: AiTradeSignal["action"] = "HOLD";

  // 1) MTF confluence — asosiy manba
  if (score >= 8) action = "BUY";
  else if (score <= -8) action = "SELL";

  // 2) Yangilik (uzoq muddat uchun muhim)
  if (action === "HOLD" && news) {
    if (news.overallBias === "bullish" && news.biasStrength >= 56 && score >= 0) action = "BUY";
    else if (news.overallBias === "bearish" && news.biasStrength >= 56 && score <= 0) action = "SELL";
  }

  // 3) Struktura trendi
  if (action === "HOLD" && structure) {
    if (structure.trend === "bullish" && score >= -2) action = "BUY";
    else if (structure.trend === "bearish" && score <= 2) action = "SELL";
  }

  // 4) Yumshoq lean — confluence yo'nalishi
  if (action === "HOLD" && Math.abs(score) >= 4) action = score > 0 ? "BUY" : "SELL";
  if (action === "HOLD" && mtf.bias !== "neutral") action = mtf.bias === "long" ? "BUY" : "SELL";

  // Targetlar — 1h ATR + struktura, uzoq muddat uchun keng
  const atr = Math.max(4, Math.min(22, tech1h.atr || 8));
  const slDist = Math.max(6, atr * 1.2);
  const tpDist = Math.max(14, slDist * 2.2);
  const MAX_SL = 28;
  const MAX_TP = 75;
  const MIN_SL = 6;
  const MIN_TP = 14;

  let entry = round2(price);
  let stopLoss = round2(price - slDist);
  let takeProfit = round2(price + tpDist);
  let confidence = Math.max(strategy.confidence, Math.min(90, 50 + Math.abs(score)));

  if (action !== "HOLD") {
    entry = round2(price);
    if (action === "BUY") {
      const rawSl = structure?.s1;
      const sl = rawSl != null && rawSl < price - 2 ? rawSl : price - slDist;
      const slD = Math.min(MAX_SL, Math.max(MIN_SL, price - sl));
      stopLoss = round2(price - slD);
      const rawTp = structure?.r1;
      const tp = rawTp != null && rawTp > price + 2 ? rawTp : price + tpDist;
      const tpD = Math.min(MAX_TP, Math.max(MIN_TP, tp - price));
      takeProfit = round2(price + Math.max(tpD, slD * 1.6));
    } else {
      const rawSl = structure?.r1;
      const sl = rawSl != null && rawSl > price + 2 ? rawSl : price + slDist;
      const slD = Math.min(MAX_SL, Math.max(MIN_SL, sl - price));
      stopLoss = round2(price + slD);
      const rawTp = structure?.s1;
      const tp = rawTp != null && rawTp < price - 2 ? rawTp : price - tpDist;
      const tpD = Math.min(MAX_TP, Math.max(MIN_TP, price - tp));
      takeProfit = round2(price - Math.max(tpD, slD * 1.6));
    }
  }

  const riskReward = round2(Math.abs(takeProfit - entry) / Math.max(1, Math.abs(entry - stopLoss)));

  // Haqqoniy, o'zgaruvchan yutish ehtimoli — qarama-qarshi TF jazolanadi
  const swingBias = action === "BUY" ? "long" : action === "SELL" ? "short" : "neutral";
  const disTf =
    action === "HOLD"
      ? 0
      : mtf.perTf.filter((p) => p.result.bias !== "neutral" && p.result.bias !== swingBias).length;
  // Uzluksiz score asosiy omil — to'yinish kamayadi, qiymatlar tabiiy o'zgaradi
  let wp = 46 + Math.abs(score) * 0.45 + mtf.alignedTf * 2.5 + mtf.strength * 0.08 - disTf * 6;
  // 1h RSI ekstremum — trend davomiga qarshi xavf
  const rsi1h = tech1h.rsi;
  if (action === "BUY" && rsi1h >= 72) wp -= 5;
  if (action === "SELL" && rsi1h <= 28) wp -= 5;
  if (news && action !== "HOLD") {
    const newsDir = news.overallBias === "bullish" ? "long" : news.overallBias === "bearish" ? "short" : "neutral";
    if (newsDir === swingBias && news.biasStrength >= 55) wp += 3;
    else if (newsDir !== "neutral" && newsDir !== swingBias) wp -= 3;
  }
  if (mtf.alignedTf <= 1 && Math.abs(score) < 8) wp -= 6;
  if (mtf.bias === "neutral") wp -= 8;
  wp = Math.round(Math.min(87, Math.max(42, wp)));
  const grade = action === "HOLD" ? undefined : wp >= 78 ? "A+" : wp >= 70 ? "A" : wp >= 60 ? "B" : wp >= 52 ? "C" : "D";

  const perTfLine = mtf.perTf
    .map((p) => `${p.tf} ${p.result.bias === "long" ? "↑" : p.result.bias === "short" ? "↓" : "·"}${Math.abs(p.result.score)}`)
    .join("  ");

  const triggerUz =
    action === "HOLD"
      ? `Kutish — TF mos emas (${mtf.alignedTf}/${mtf.totalTf})`
      : `${mtf.summaryUz} · ${strategy.entry.whenUz}`;

  return {
    action,
    entry,
    stopLoss,
    takeProfit,
    confidence: Math.round(confidence),
    riskReward,
    winProbability: wp,
    confluencePct: mtf.strength,
    signalGrade: grade,
    analysisUz: [
      `◷ UZOQ MUDDAT — trend-following + struktura strategiyasi (15m/1h/4h/1d MTF)`,
      `Indikatorlar: EMA 50/200, Supertrend, MACD, ADX/DMI, Ichimoku, Donchian, RSI(14), swing struktura`,
      mtf.summaryUz,
      `TF: ${perTfLine}`,
      structure?.summaryUz ?? "",
      strategy.playbookUz || strategy.situationUz,
      news ? `Yangilik: ${news.overallBias} ${news.biasStrength}%` : "",
      `Sessiya: ${session.nameUz}`,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 900),
    triggerUz,
    invalidationUz:
      action === "BUY"
        ? `$${stopLoss} ostida kunlik yopilsa — trend buzildi`
        : action === "SELL"
          ? `$${stopLoss} ustida kunlik yopilsa — trend buzildi`
          : strategy.invalidationUz,
    summaryUz:
      action === "HOLD"
        ? `KUTING · MTF L${mtf.longScore}/S${mtf.shortScore}`
        : `${action} · ~${wp}% · ${grade} · R:R ${riskReward} · ${mtf.alignedTf}/${mtf.totalTf} TF mos`,
    panelUz: `MTF L${mtf.longScore}/S${mtf.shortScore} · ${mtf.alignedTf}/${mtf.totalTf} TF · ${news?.overallBias ?? "—"}`,
    forecastHigh: action === "SELL" ? entry : Math.max(takeProfit, structure?.r1 ?? takeProfit),
    forecastLow: action === "BUY" ? entry : Math.min(takeProfit, structure?.s1 ?? takeProfit),
    forecastBiasUz: score > 4 ? "↑ LONG" : score < -4 ? "↓ SHORT" : mtf.bias === "long" ? "↑ LONG" : mtf.bias === "short" ? "↓ SHORT" : "—",
    modeLabelUz: SWING_META.label,
    holdTimeUz: SWING_META.holdTimeUz,
    topVotes: mtf.topVotes,
  };
}

/** Rejim bo'yicha signal qurish */
export function buildModeSignal(
  mode: SignalMode,
  input: ModeEngineInput
): ModeBuildResult {
  const result = mode === "scalp" ? buildScalpSignal(input) : buildSwingSignal(input);

  // HOLD holatida yutish ehtimoli chalg'itmasligi uchun past ushlanadi
  if (result.action === "HOLD") {
    result.winProbability = Math.min(result.winProbability, 45);
    result.signalGrade = undefined;
  }

  // Yakuniy sanity — target/stop yo'nalishi to'g'ri ekanini kafolatlash
  if (result.action === "BUY") {
    if (result.takeProfit <= result.entry) result.takeProfit = round2(result.entry + (mode === "scalp" ? 2.5 : 9));
    if (result.stopLoss >= result.entry) result.stopLoss = round2(result.entry - (mode === "scalp" ? 1.8 : 5));
  } else if (result.action === "SELL") {
    if (result.takeProfit >= result.entry) result.takeProfit = round2(result.entry - (mode === "scalp" ? 2.5 : 9));
    if (result.stopLoss <= result.entry) result.stopLoss = round2(result.entry + (mode === "scalp" ? 1.8 : 5));
  }

  if (result.action !== "HOLD") {
    const risk = Math.abs(result.entry - result.stopLoss) || 1;
    result.riskReward = round2(Math.abs(result.takeProfit - result.entry) / risk);
  }

  return result;
}
