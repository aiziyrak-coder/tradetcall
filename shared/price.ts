import type { PriceData } from "./types";
import { fetchJson } from "./fetch-util";
import type { YahooChartResponse } from "./yahoo-api";

interface GoldApiResponse {
  price?: number;
}

/** Spot XAU/USD — broker/TradingView ga yaqin */
async function fetchSpotGoldApi(): Promise<number | null> {
  const data = await fetchJson<GoldApiResponse>("https://api.gold-api.com/price/XAU", {
    headers: { Accept: "application/json" },
    timeoutMs: 8000,
    retries: 2,
  });
  if (typeof data?.price === "number" && data.price > 1000) {
    return Math.round(data.price * 100) / 100;
  }
  return null;
}

async function fetchYahooMeta(symbol: string): Promise<{
  price: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
  time: number;
} | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const data = await fetchJson<YahooChartResponse>(url, {
    timeoutMs: 8000,
    retries: 1,
  });
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return null;
  const price = meta.regularMarketPrice;
  const prevClose = (meta.chartPreviousClose ?? meta.previousClose ?? price) as number;
  return {
    price,
    prevClose,
    dayHigh: (meta.regularMarketDayHigh ?? price) as number,
    dayLow: (meta.regularMarketDayLow ?? price) as number,
    time: (meta.regularMarketTime ?? Date.now() / 1000) as number,
  };
}

/** Tez tick — faqat spot narx (grafik/stream uchun, ~300–800ms) */
export async function getXAUUSDPriceLive(prev: PriceData | null): Promise<PriceData> {
  const spot = await fetchSpotGoldApi();
  if (spot && prev) {
    const prevClose = prev.price - prev.change;
    const change = Math.round((spot - prevClose) * 100) / 100;
    const changePercent =
      prevClose !== 0 ? Math.round((change / prevClose) * 10000) / 100 : 0;
    return {
      ...prev,
      price: spot,
      change,
      changePercent,
      timestamp: new Date().toISOString(),
      source: prev.source,
    };
  }
  return getXAUUSDPrice();
}

export async function getXAUUSDPrice(): Promise<PriceData> {
  const [spot, yahoo] = await Promise.all([
    fetchSpotGoldApi(),
    fetchYahooMeta("GC=F"),
  ]);

  if (spot && yahoo) {
    const scale = spot / yahoo.price;
    const prevClose = Math.round(yahoo.prevClose * scale * 100) / 100;
    const change = Math.round((spot - prevClose) * 100) / 100;
    const changePercent =
      prevClose !== 0 ? Math.round((change / prevClose) * 10000) / 100 : 0;

    return {
      symbol: "XAUUSD",
      price: spot,
      change,
      changePercent,
      high24h: Math.round(yahoo.dayHigh * scale * 100) / 100,
      low24h: Math.round(yahoo.dayLow * scale * 100) / 100,
      timestamp: new Date(yahoo.time * 1000).toISOString(),
      source: "Spot + Yahoo",
    };
  }

  if (spot) {
    return {
      symbol: "XAUUSD",
      price: spot,
      change: 0,
      changePercent: 0,
      timestamp: new Date().toISOString(),
      source: "Spot XAU/USD",
    };
  }

  if (yahoo) {
    const change = yahoo.price - yahoo.prevClose;
    const changePercent =
      yahoo.prevClose !== 0
        ? Math.round((change / yahoo.prevClose) * 10000) / 100
        : 0;
    return {
      symbol: "XAUUSD",
      price: Math.round(yahoo.price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent,
      high24h: Math.round(yahoo.dayHigh * 100) / 100,
      low24h: Math.round(yahoo.dayLow * 100) / 100,
      timestamp: new Date(yahoo.time * 1000).toISOString(),
      source: "Yahoo GC=F",
    };
  }

  throw new Error("XAUUSD narxi olinmadi — internet yoki manba tekshiring");
}

/** Grafik shamini spot narxga moslashtirish (futures → spot) */
export function alignCandlesToSpot(
  candles: import("./types").Candle[],
  spotPrice: number
): import("./types").Candle[] {
  if (!candles.length || !Number.isFinite(spotPrice)) return candles;
  const last = candles[candles.length - 1].close;
  if (!last || last <= 0) return candles;
  const offset = spotPrice - last;
  if (Math.abs(offset) < 0.01) return candles;
  return candles.map((c) => ({
    time: c.time,
    open: Math.round((c.open + offset) * 100) / 100,
    high: Math.round((c.high + offset) * 100) / 100,
    low: Math.round((c.low + offset) * 100) / 100,
    close: Math.round((c.close + offset) * 100) / 100,
  }));
}
