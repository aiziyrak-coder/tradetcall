/**
 * Bozor strukturasi — HH/HL/LH/LL, pivot, swing nuqtalar
 */

import type { Candle } from "./types";

export type StructureTrend = "bullish" | "bearish" | "range";

export interface MarketStructure {
  trend: StructureTrend;
  swingHigh: number;
  swingLow: number;
  lastSwingHigh: number;
  lastSwingLow: number;
  pivot: number;
  r1: number;
  s1: number;
  r2: number;
  s2: number;
  summaryUz: string;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function swingPoints(candles: Candle[], lookback = 5): { highs: number[]; lows: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];
  const slice = candles.slice(-lookback * 3);
  for (let i = 2; i < slice.length - 2; i++) {
    const h = slice[i].high;
    const l = slice[i].low;
    if (h >= slice[i - 1].high && h >= slice[i - 2].high && h >= slice[i + 1].high) {
      highs.push(h);
    }
    if (l <= slice[i - 1].low && l <= slice[i - 2].low && l <= slice[i + 1].low) {
      lows.push(l);
    }
  }
  return { highs, lows };
}

export function analyzeMarketStructure(candles: Candle[], price: number): MarketStructure {
  const { highs, lows } = swingPoints(candles);
  const swingHigh = highs.length ? Math.max(...highs) : price + 2;
  const swingLow = lows.length ? Math.min(...lows) : price - 2;
  const lastSwingHigh = highs[highs.length - 1] ?? swingHigh;
  const lastSwingLow = lows[lows.length - 1] ?? swingLow;

  let hh = 0;
  let hl = 0;
  let lh = 0;
  let ll = 0;
  for (let i = 1; i < highs.length; i++) {
    if (highs[i] > highs[i - 1]) hh++;
    else lh++;
  }
  for (let i = 1; i < lows.length; i++) {
    if (lows[i] > lows[i - 1]) hl++;
    else ll++;
  }

  let trend: StructureTrend = "range";
  if (hh >= 1 && hl >= 1 && hh + hl > lh + ll) trend = "bullish";
  else if (lh >= 1 && ll >= 1 && lh + ll > hh + hl) trend = "bearish";

  const prev = candles[candles.length - 2];
  const pivot = prev
    ? round2((prev.high + prev.low + prev.close) / 3)
    : round2(price);
  const range = prev ? prev.high - prev.low : 4;
  const r1 = round2(2 * pivot - prev!.low);
  const s1 = round2(2 * pivot - prev!.high);
  const r2 = round2(pivot + range);
  const s2 = round2(pivot - range);

  const summaryUz =
    trend === "bullish"
      ? `Struktur BULLISH — HH/HL (${hh}/${hl}). Pivot $${pivot}, R1 $${r1}, S1 $${s1}`
      : trend === "bearish"
        ? `Struktur BEARISH — LH/LL (${lh}/${ll}). Pivot $${pivot}, R1 $${r1}, S1 $${s1}`
        : `Struktur RANGE — pivot $${pivot}, diapazon $${s1}–$${r1}`;

  return {
    trend,
    swingHigh: round2(swingHigh),
    swingLow: round2(swingLow),
    lastSwingHigh: round2(lastSwingHigh),
    lastSwingLow: round2(lastSwingLow),
    pivot,
    r1,
    s1,
    r2,
    s2,
    summaryUz,
  };
}
