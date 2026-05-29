/**
 * Kengaytirilgan indikatorlar — MACD, Bollinger, EMA, trend kuchi
 */

import type { Candle, TechnicalAnalysis } from "./types";
import { analyzeTechnicals, wilderAtr } from "./technical";

export interface EnhancedIndicators {
  macd: number;
  macdSignal: number;
  macdHist: number;
  macdBias: "bullish" | "bearish" | "neutral";
  bbUpper: number;
  bbLower: number;
  bbMid: number;
  /** 0–100: 0 = past band, 100 = yuqori band */
  bbPositionPct: number;
  ema9: number;
  ema21: number;
  ema50: number;
  trendStrength: number;
  volumeBias: "bullish" | "bearish" | "neutral";
}

function ema(values: number[], period: number): number {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let v = values[0];
  for (let i = 1; i < values.length; i++) v = values[i] * k + v * (1 - k);
  return v;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeEnhancedIndicators(candles: Candle[]): EnhancedIndicators {
  const closes = candles.map((c) => c.close);
  const n = closes.length;
  const price = closes[n - 1] ?? 0;

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = ema12 - ema26;
  const macdLine = closes.map((_, i) => {
    const slice = closes.slice(0, i + 1);
    if (slice.length < 5) return 0;
    return ema(slice, 12) - ema(slice, 26);
  });
  const macdSignal = ema(macdLine.slice(-9), 9);
  const macdHist = macd - macdSignal;
  let macdBias: EnhancedIndicators["macdBias"] = "neutral";
  if (macdHist > 0.08) macdBias = "bullish";
  else if (macdHist < -0.08) macdBias = "bearish";

  const period = Math.min(20, n);
  const slice = closes.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / Math.max(slice.length, 1);
  const variance =
    slice.reduce((a, c) => a + (c - mid) ** 2, 0) / Math.max(slice.length, 1);
  const std = Math.sqrt(variance) || price * 0.0005;
  const bbUpper = mid + 2 * std;
  const bbLower = mid - 2 * std;
  const bbMid = mid;
  const range = bbUpper - bbLower || 1;
  const bbPositionPct = Math.min(100, Math.max(0, Math.round(((price - bbLower) / range) * 100)));

  const ema9v = ema(closes, 9);
  const ema21v = ema(closes, 21);
  const ema50v = ema(closes, Math.min(50, n));

  const tech = analyzeTechnicals(candles);
  let trendStrength = Math.min(
    100,
    Math.round(
      tech.adx * 1.8 +
        (tech.trend === "bullish" ? 12 : tech.trend === "bearish" ? 12 : 0) +
        (macdBias === "bullish" && tech.trend === "bullish" ? 15 : 0) +
        (macdBias === "bearish" && tech.trend === "bearish" ? 15 : 0) +
        (price > ema9v && ema9v > ema21v ? 10 : 0) +
        (price < ema9v && ema9v < ema21v ? 10 : 0)
    )
  );

  const last5 = candles.slice(-5);
  let bullVol = 0;
  let bearVol = 0;
  for (const c of last5) {
    const body = Math.abs(c.close - c.open);
    if (c.close > c.open) bullVol += body;
    else bearVol += body;
  }
  let volumeBias: EnhancedIndicators["volumeBias"] = "neutral";
  if (bullVol > bearVol * 1.35) volumeBias = "bullish";
  else if (bearVol > bullVol * 1.35) volumeBias = "bearish";

  return {
    macd: round2(macd),
    macdSignal: round2(macdSignal),
    macdHist: round2(macdHist),
    macdBias,
    bbUpper: round2(bbUpper),
    bbLower: round2(bbLower),
    bbMid: round2(bbMid),
    bbPositionPct,
    ema9: round2(ema9v),
    ema21: round2(ema21v),
    ema50: round2(ema50v),
    trendStrength,
    volumeBias,
  };
}

export function analyzeTechnicalsFull(candles: Candle[]): TechnicalAnalysis & {
  enhanced: EnhancedIndicators;
} {
  const base = analyzeTechnicals(candles);
  const enhanced = computeEnhancedIndicators(candles);
  const atr = base.atr || wilderAtr(candles);
  const rsiVal = base.rsi;

  let momentum = base.momentum;
  if (enhanced.macdBias === "bullish" && rsiVal > 45 && rsiVal < 68) {
    momentum = `MACD ijobiy · trend kuchi ${enhanced.trendStrength}% · EMA9>21`;
  } else if (enhanced.macdBias === "bearish" && rsiVal < 55 && rsiVal > 32) {
    momentum = `MACD salbiy · trend kuchi ${enhanced.trendStrength}% · EMA9<21`;
  } else if (enhanced.bbPositionPct > 85) {
    momentum = "Bollinger yuqori — ehtiyot, qaytish mumkin";
  } else if (enhanced.bbPositionPct < 15) {
    momentum = "Bollinger past — oversold, qaytish mumkin";
  }

  return {
    ...base,
    momentum,
    atr,
    enhanced,
  };
}

export function formatEnhancedForAi(
  tech: TechnicalAnalysis & { enhanced?: EnhancedIndicators },
  label: string
): string {
  const e = tech.enhanced;
  if (!e) return `${label}: RSI ${tech.rsi}, ADX ${tech.adx}, ${tech.trend}`;
  return `${label}: RSI ${tech.rsi}, ADX ${tech.adx}, trend ${tech.trend}, kuch ${e.trendStrength}%
MACD ${e.macdBias} (hist ${e.macdHist}), BB pozitsiya ${e.bbPositionPct}%
EMA9 ${e.ema9} / EMA21 ${e.ema21}, hajm ${e.volumeBias}
Qo'llab: ${tech.support.slice(0, 2).join(", ")} | Qarshi: ${tech.resistance.slice(0, 2).join(", ")}`;
}
