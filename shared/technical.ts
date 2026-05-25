import type { Candle, TechnicalAnalysis } from "./types";

function sma(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] ?? 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

function swingLevels(candles: Candle[], lookback = 30): { support: number[]; resistance: number[] } {
  const recent = candles.slice(-lookback);
  const lows = recent.map((c) => c.low).sort((a, b) => a - b);
  const highs = recent.map((c) => c.high).sort((a, b) => b - a);
  return {
    support: [lows[1] ?? lows[0], lows[Math.floor(lows.length * 0.15)]].filter(Boolean),
    resistance: [
      highs[highs.length - 2] ?? highs[highs.length - 1],
      highs[Math.floor(highs.length * 0.85)],
    ].filter(Boolean),
  };
}

export function analyzeTechnicals(candles: Candle[]): TechnicalAnalysis {
  const closes = candles.map((c) => c.close);
  const current = closes[closes.length - 1] ?? 0;
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, Math.min(50, closes.length));
  const rsiVal = rsi(closes);
  const { support, resistance } = swingLevels(candles);

  let trend: TechnicalAnalysis["trend"] = "neutral";
  if (current > sma20 && sma20 > sma50 && rsiVal > 52) trend = "bullish";
  else if (current < sma20 && sma20 < sma50 && rsiVal < 48) trend = "bearish";

  let momentum = "Barqaror";
  if (rsiVal > 70) momentum = "Haddan tashqari sotib olingan (tuzatish mumkin)";
  else if (rsiVal < 30) momentum = "Haddan tashqari sotilgan (qaytish mumkin)";
  else if (rsiVal > 55) momentum = "Yuqoriga impuls";
  else if (rsiVal < 45) momentum = "Pastga bosim";

  return {
    rsi: rsiVal,
    trend,
    sma20: Math.round(sma20 * 100) / 100,
    sma50: Math.round(sma50 * 100) / 100,
    support: support.map((s) => Math.round(s * 100) / 100),
    resistance: resistance.map((r) => Math.round(r * 100) / 100),
    momentum,
  };
}
