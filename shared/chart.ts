import type { Candle } from "./types";
import { alignCandlesToSpot } from "./price";
import { fetchJson } from "./fetch-util";
import type { YahooChartResponse } from "./yahoo-api";

export type ChartInterval = "1m" | "5m" | "15m" | "1h" | "4h";

const INTERVAL_MAP: Record<ChartInterval, { range: string; interval: string }> = {
  "1m": { range: "1d", interval: "1m" },
  "5m": { range: "5d", interval: "5m" },
  "15m": { range: "5d", interval: "15m" },
  "1h": { range: "1mo", interval: "1h" },
  "4h": { range: "3mo", interval: "1h" },
};

async function fetchYahooCandles(
  symbol: string,
  interval: ChartInterval
): Promise<Candle[]> {
  const cfg = INTERVAL_MAP[interval];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${cfg.interval}&range=${cfg.range}`;
  const data = await fetchJson<YahooChartResponse>(url, {
    timeoutMs: 12_000,
    retries: 1,
  });

  const result = data?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  if (!q || timestamps.length < 10) return [];

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({
      time: timestamps[i],
      open: Math.round(o * 100) / 100,
      high: Math.round(h * 100) / 100,
      low: Math.round(l * 100) / 100,
      close: Math.round(c * 100) / 100,
    });
  }
  return candles;
}

export async function fetchXAUUSDCandles(
  interval: ChartInterval = "5m",
  spotPrice?: number
): Promise<Candle[]> {
  let candles = await fetchYahooCandles("GC=F", interval);
  if (candles.length < 10) {
    candles = await fetchYahooCandles("MGC=F", interval);
  }
  if (spotPrice && candles.length > 0) {
    candles = alignCandlesToSpot(candles, spotPrice);
  }
  return candles;
}

/** Oxirgi shamni jonli spot narx bilan yangilash */
export function patchLastCandle(candles: Candle[], livePrice: number): Candle[] {
  if (!candles.length || !Number.isFinite(livePrice)) return candles;
  const aligned = alignCandlesToSpot(candles, livePrice);
  const last = aligned[aligned.length - 1];
  const patched: Candle = {
    ...last,
    close: Math.round(livePrice * 100) / 100,
    high: Math.round(Math.max(last.high, livePrice) * 100) / 100,
    low: Math.round(Math.min(last.low, livePrice) * 100) / 100,
  };
  return [...aligned.slice(0, -1), patched];
}
