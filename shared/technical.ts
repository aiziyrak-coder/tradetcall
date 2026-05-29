import type { Candle, TechnicalAnalysis } from "./types";

function sma(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] ?? 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/** Wilder RSI */
export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 2) return 50;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

/** Wilder ATR */
export function wilderAtr(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
  }
  if (trs.length < period) {
    return trs.reduce((a, b) => a + b, 0) / Math.max(trs.length, 1);
  }
  let atrVal = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atrVal = (atrVal * (period - 1) + trs[i]) / period;
  }
  return Math.round(atrVal * 100) / 100;
}

function wilderAdx(candles: Candle[], period = 14): number {
  if (candles.length < period + 2) return 0;
  const plusDm: number[] = [];
  const minusDm: number[] = [];
  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    plusDm.push(up > down && up > 0 ? up : 0);
    minusDm.push(down > up && down > 0 ? down : 0);
    const c = candles[i];
    const prev = candles[i - 1];
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
  }
  const smooth = (arr: number[]) => {
    let v = arr.slice(0, period).reduce((a, b) => a + b, 0);
    const out = [v];
    for (let i = period; i < arr.length; i++) {
      v = v - v / period + arr[i];
      out.push(v);
    }
    return out;
  };
  const trS = smooth(tr);
  const plusS = smooth(plusDm);
  const minusS = smooth(minusDm);
  const dx: number[] = [];
  for (let i = 0; i < trS.length; i++) {
    if (trS[i] === 0) continue;
    const pdi = (100 * plusS[i]) / trS[i];
    const mdi = (100 * minusS[i]) / trS[i];
    const sum = pdi + mdi;
    if (sum > 0) dx.push((100 * Math.abs(pdi - mdi)) / sum);
  }
  if (!dx.length) return 0;
  return Math.round(dx[dx.length - 1] * 10) / 10;
}

/** Fractal swing highs/lows */
function swingLevels(candles: Candle[], left = 2, right = 2): { support: number[]; resistance: number[] } {
  const supports: number[] = [];
  const resistances: number[] = [];
  for (let i = left; i < candles.length - right; i++) {
    const c = candles[i];
    let isLow = true;
    let isHigh = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      if (candles[j].low < c.low) isLow = false;
      if (candles[j].high > c.high) isHigh = false;
    }
    if (isLow) supports.push(c.low);
    if (isHigh) resistances.push(c.high);
  }
  const current = candles[candles.length - 1]?.close ?? 0;
  const below = supports.filter((s) => s < current).sort((a, b) => b - a);
  const above = resistances.filter((r) => r > current).sort((a, b) => a - b);
  const fallbackLow = Math.min(...candles.slice(-20).map((c) => c.low));
  const fallbackHigh = Math.max(...candles.slice(-20).map((c) => c.high));
  return {
    support: [below[0] ?? fallbackLow, below[1] ?? below[0] ?? fallbackLow].filter(Boolean),
    resistance: [above[0] ?? fallbackHigh, above[1] ?? above[0] ?? fallbackHigh].filter(Boolean),
  };
}

function priorDayLevels(candles: Candle[]): { high: number; low: number } | null {
  if (candles.length < 10) return null;
  const daySec = 86400;
  const last = candles[candles.length - 1];
  const dayStart = last.time - (last.time % daySec) - daySec;
  const prevDay = candles.filter((c) => c.time >= dayStart - daySec && c.time < dayStart);
  if (prevDay.length < 3) return null;
  return {
    high: Math.max(...prevDay.map((c) => c.high)),
    low: Math.min(...prevDay.map((c) => c.low)),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function analyzeTechnicals(candles: Candle[]): TechnicalAnalysis {
  const closes = candles.map((c) => c.close);
  const current = closes[closes.length - 1] ?? 0;
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, Math.min(50, closes.length));
  const rsiVal = rsi(closes);
  const atrVal = wilderAtr(candles) || current * 0.001;
  const adxVal = wilderAdx(candles);
  const { support, resistance } = swingLevels(candles);
  const prior = priorDayLevels(candles);

  let trend: TechnicalAnalysis["trend"] = "neutral";
  const adxTrendMin = 16;
  if (current > sma20 && sma20 > sma50 && rsiVal > 48 && adxVal >= adxTrendMin) trend = "bullish";
  else if (current < sma20 && sma20 < sma50 && rsiVal < 52 && adxVal >= adxTrendMin) trend = "bearish";
  else if (adxVal < adxTrendMin) trend = "neutral";

  let momentum = "Barqaror";
  if (rsiVal > 70) momentum = "Haddan tashqari sotib olingan — tuzatish mumkin";
  else if (rsiVal < 30) momentum = "Haddan tashqari sotilgan — qaytish mumkin";
  else if (rsiVal > 58 && trend === "bullish") momentum = "Yuqoriga impuls (ADX " + adxVal + ")";
  else if (rsiVal < 42 && trend === "bearish") momentum = "Pastga bosim (ADX " + adxVal + ")";
  else if (adxVal >= 25) momentum = "Kuchli trend — signal ishonchliligi yuqori";
  else if (adxVal < 18) momentum = "Range — breakout kuting";

  const levels = {
    support: support.map((s) => round2(s)),
    resistance: resistance.map((r) => round2(r)),
  };

  if (prior) {
    if (prior.low < current && !levels.support.includes(round2(prior.low))) {
      levels.support.unshift(round2(prior.low));
    }
    if (prior.high > current && !levels.resistance.includes(round2(prior.high))) {
      levels.resistance.unshift(round2(prior.high));
    }
    levels.support = levels.support.slice(0, 3);
    levels.resistance = levels.resistance.slice(0, 3);
  }

  return {
    rsi: rsiVal,
    trend,
    sma20: round2(sma20),
    sma50: round2(sma50),
    support: levels.support,
    resistance: levels.resistance,
    momentum,
    atr: atrVal,
    adx: adxVal,
    priorDayHigh: prior ? round2(prior.high) : undefined,
    priorDayLow: prior ? round2(prior.low) : undefined,
  };
}
