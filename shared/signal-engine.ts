/**
 * Shaffof signal engine — RSI / SMA cross / ADX / momentum.
 * Har faktor −1..+1; vaznli yig'indi → foiz va tasdiq/qarshi sonlari.
 * Hisob: `technicalindicators` (sinovdan o'tgan kutubxona).
 */

import * as ti from "technicalindicators";
import type { Candle } from "./types";

const RSI = ti.RSI;
const SMA = ti.SMA;
const ADX = ti.ADX;
const ROC = ti.ROC;

export interface FactorScore {
  id: "rsi" | "sma" | "adx" | "momentum";
  labelUz: string;
  /** −1 (SELL) … +1 (BUY) */
  score: number;
  weight: number;
  valueUz: string;
  side: "buy" | "sell" | "neutral";
}

export interface EngineSignal {
  action: "BUY" | "SELL" | "HOLD";
  /** 0–100 ishonch (ADX past bo'lsa pastroq) */
  confidence: number;
  /** Yo'nalish foizi (masalan SELL 68%) */
  percent: number;
  rawScore: number;
  factors: FactorScore[];
  confirmations: number;
  against: number;
  rsi: number;
  sma20: number;
  sma50: number;
  adx: number;
  summaryUz: string;
}

const WEIGHTS = {
  rsi: 0.25,
  sma: 0.3,
  adx: 0.2,
  momentum: 0.25,
} as const;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function lastOf(arr: number[], fallback = 0): number {
  return arr.length ? arr[arr.length - 1]! : fallback;
}

/** RSI: trendda momentum, rangeda ehtiyotkor reversion (ADX bilan) */
function scoreRsi(rsi: number, adx: number, plusDi: number, minusDi: number): number {
  const trending = adx >= 20;
  const upTrend = plusDi > minusDi;
  if (trending) {
    // Trendda oversold ≠ avtomatik BUY
    if (rsi <= 30) return upTrend ? 0.15 : -0.35;
    if (rsi >= 70) return upTrend ? 0.35 : -0.15;
    if (rsi > 55) return clamp((rsi - 50) / 40, 0, 0.55);
    if (rsi < 45) return -clamp((50 - rsi) / 40, 0, 0.55);
    return 0;
  }
  // Range: ekstremumda yumshoq reversion, o'rtada neytral
  if (rsi <= 28) return clamp((28 - rsi) / 28, 0, 0.55);
  if (rsi >= 72) return -clamp((rsi - 72) / 28, 0, 0.55);
  return 0;
}

/** SMA20 vs SMA50 + narx joylashuvi */
function scoreSma(price: number, sma20: number, sma50: number): number {
  if (sma20 <= 0 || sma50 <= 0) return 0;
  const cross = sma20 > sma50 ? 1 : sma20 < sma50 ? -1 : 0;
  const pos = price > sma20 ? 0.35 : price < sma20 ? -0.35 : 0;
  return clamp(cross * 0.65 + pos, -1, 1);
}

/** ADX kuch + DI yo'nalishi */
function scoreAdx(adx: number, plusDi: number, minusDi: number): number {
  if (adx < 16) return 0;
  const dir = plusDi > minusDi ? 1 : minusDi > plusDi ? -1 : 0;
  const strength = clamp((adx - 16) / 34, 0, 1);
  return dir * strength;
}

/** ROC momentum */
function scoreMomentum(roc: number): number {
  if (Math.abs(roc) < 0.05) return 0;
  return clamp(roc / 1.5, -1, 1);
}

function sideOf(score: number): FactorScore["side"] {
  if (score > 0.12) return "buy";
  if (score < -0.12) return "sell";
  return "neutral";
}

/**
 * Real candle'lardan shaffof signal hisoblash.
 * Kam ma'lumot bo'lsa HOLD + past confidence.
 */
export function computeEngineSignal(candles: Candle[]): EngineSignal {
  const empty: EngineSignal = {
    action: "HOLD",
    confidence: 20,
    percent: 0,
    rawScore: 0,
    factors: [],
    confirmations: 0,
    against: 0,
    rsi: 50,
    sma20: 0,
    sma50: 0,
    adx: 0,
    summaryUz: "Ma'lumot yetarli emas — HOLD",
  };

  if (!candles || candles.length < 30) return empty;

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const price = closes[closes.length - 1] ?? 0;

  const rsiArr = RSI.calculate({ period: 14, values: closes });
  const sma20Arr = SMA.calculate({ period: 20, values: closes });
  const sma50Arr = SMA.calculate({ period: Math.min(50, closes.length), values: closes });
  const adxArr = ADX.calculate({ period: 14, high: highs, low: lows, close: closes });
  const rocArr = ROC.calculate({ period: 10, values: closes });

  const rsi = round1(lastOf(rsiArr, 50));
  const sma20 = round2(lastOf(sma20Arr, price));
  const sma50 = round2(lastOf(sma50Arr, price));
  const lastAdx = adxArr[adxArr.length - 1] as
    | { adx: number; pdi: number; mdi: number }
    | undefined;
  const adx = round1(lastAdx?.adx ?? 0);
  const plusDi = lastAdx?.pdi ?? 0;
  const minusDi = lastAdx?.mdi ?? 0;
  const roc = lastOf(rocArr, 0);

  const factors: FactorScore[] = [
    {
      id: "rsi",
      labelUz: "RSI(14)",
      score: scoreRsi(rsi, adx, plusDi, minusDi),
      weight: WEIGHTS.rsi,
      valueUz: String(rsi),
      side: "neutral",
    },
    {
      id: "sma",
      labelUz: "SMA20/50 cross",
      score: scoreSma(price, sma20, sma50),
      weight: WEIGHTS.sma,
      valueUz: `${sma20}/${sma50}`,
      side: "neutral",
    },
    {
      id: "adx",
      labelUz: "ADX(14) trend",
      score: scoreAdx(adx, plusDi, minusDi),
      weight: WEIGHTS.adx,
      valueUz: `${adx} (+DI ${round1(plusDi)}/−DI ${round1(minusDi)})`,
      side: "neutral",
    },
    {
      id: "momentum",
      labelUz: "Momentum ROC(10)",
      score: scoreMomentum(roc),
      weight: WEIGHTS.momentum,
      valueUz: `${round2(roc)}%`,
      side: "neutral",
    },
  ];
  for (const f of factors) f.side = sideOf(f.score);

  let raw = 0;
  for (const f of factors) raw += f.score * f.weight;
  raw = clamp(raw, -1, 1);

  let action: EngineSignal["action"] = "HOLD";
  // Past ADX — HOLD (range)
  if (adx >= 16) {
    const confirmsOk = (side: "buy" | "sell") =>
      factors.filter((f) => f.side === side).length >= 2 &&
      factors.filter((f) => f.side !== "neutral" && f.side !== side).length <= 1;
    if (raw >= 0.28 && confirmsOk("buy")) action = "BUY";
    else if (raw <= -0.28 && confirmsOk("sell")) action = "SELL";
  }

  const dominantSide = action === "BUY" ? "buy" : action === "SELL" ? "sell" : null;
  const confirmations = dominantSide
    ? factors.filter((f) => f.side === dominantSide).length
    : factors.filter((f) => f.side !== "neutral").length;
  const against = dominantSide
    ? factors.filter((f) => f.side !== "neutral" && f.side !== dominantSide).length
    : 0;

  // Ishonch: |skor| + ADX (past ADX → past confidence)
  const adxBoost = clamp(adx / 40, 0, 1);
  let confidence = Math.round(38 + Math.abs(raw) * 42 + adxBoost * 18);
  if (adx < 18) confidence = Math.min(confidence, 52);
  if (adx < 14) confidence = Math.min(confidence, 42);
  if (action === "HOLD") confidence = Math.min(confidence, 45);
  confidence = clamp(confidence, 20, 92);

  const percent =
    action === "HOLD"
      ? Math.round(Math.abs(raw) * 50)
      : Math.round(50 + Math.abs(raw) * 45 + (confirmations - against) * 3);

  const summaryUz =
    action === "HOLD"
      ? `HOLD · skor ${round2(raw)} · ADX ${adx} (kuchsiz/neytral)`
      : `${action} ${clamp(percent, 0, 99)}% · ${confirmations} tasdiq / ${against} qarshi · ADX ${adx}`;

  return {
    action,
    confidence,
    percent: clamp(percent, 0, 99),
    rawScore: round2(raw),
    factors,
    confirmations,
    against,
    rsi,
    sma20,
    sma50,
    adx,
    summaryUz,
  };
}
