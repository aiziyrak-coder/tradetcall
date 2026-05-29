import type { PriceData } from "./types";
import { fetchJson } from "./fetch-util";
import type { YahooChartResponse } from "./yahoo-api";

interface GoldApiResponse {
  price?: number;
}

const YAHOO_SYMBOLS = ["XAUUSD=X", "GC=F"];

async function fetchYahooMeta(symbol: string): Promise<{
  price: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
  time: number;
} | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const data = await fetchJson<YahooChartResponse>(url, {
    timeoutMs: 6000,
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

async function fetchYahooLive(): Promise<{
  price: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
  time: number;
  symbol: string;
} | null> {
  for (const sym of YAHOO_SYMBOLS) {
    const m = await fetchYahooMeta(sym);
    if (m && m.price > 1000) {
      return { ...m, symbol: sym };
    }
  }
  return null;
}

async function fetchSpotGoldApi(): Promise<number | null> {
  const data = await fetchJson<GoldApiResponse>("https://api.gold-api.com/price/XAU", {
    headers: { Accept: "application/json" },
    timeoutMs: 5000,
    retries: 2,
  });
  if (typeof data?.price === "number" && data.price > 1000) {
    return Math.round(data.price * 100) / 100;
  }
  return null;
}

function buildPriceData(
  livePrice: number,
  prevClose: number,
  dayHigh: number,
  dayLow: number,
  marketTime: number,
  source: string,
  feed: PriceData["feed"]
): PriceData {
  const change = Math.round((livePrice - prevClose) * 100) / 100;
  const changePercent =
    prevClose !== 0 ? Math.round((change / prevClose) * 10000) / 100 : 0;
  return {
    symbol: "XAUUSD",
    price: livePrice,
    change,
    changePercent,
    high24h: Math.round(dayHigh * 100) / 100,
    low24h: Math.round(dayLow * 100) / 100,
    timestamp: new Date(marketTime * 1000).toISOString(),
    source,
    feed,
  };
}

/** Spot API birinchi, Yahoo zaxira — aralashmasdan bitta aniq narx */
export async function getXAUUSDPriceLive(): Promise<PriceData> {
  const [spot, yahoo] = await Promise.all([fetchSpotGoldApi(), fetchYahooLive()]);

  if (spot) {
    const prev = yahoo?.prevClose ?? spot;
    const high = yahoo?.dayHigh ?? spot;
    const low = yahoo?.dayLow ?? spot;
    const time = yahoo?.time ?? Date.now() / 1000;
    return buildPriceData(spot, prev, high, low, time, "Spot API (XAU)", "spot");
  }

  if (yahoo) {
    return buildPriceData(
      Math.round(yahoo.price * 100) / 100,
      yahoo.prevClose,
      yahoo.dayHigh,
      yahoo.dayLow,
      yahoo.time,
      `Yahoo ${yahoo.symbol}`,
      "yahoo"
    );
  }

  throw new Error("XAUUSD narxi olinmadi — internet yoki API tekshiring");
}

export async function getXAUUSDPrice(): Promise<PriceData> {
  return getXAUUSDPriceLive();
}

/** Ichki signal uchun shamni spot narxga siljitish */
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
