import type { PriceData } from "./types";
import { fetchJson } from "./fetch-util";
import type { YahooChartResponse } from "./yahoo-api";

interface GoldApiResponse {
  price?: number;
}

const YAHOO_SYMBOLS = ["XAUUSD=X", "GC=F", "MGC=F"];

let yahooReferencePrice: number | null = null;

export function setYahooReferencePrice(price: number): void {
  yahooReferencePrice = price;
}

export function peekYahooReferencePrice(): number | null {
  return yahooReferencePrice;
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
    timeoutMs: 5000,
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

/** Eng yangi Yahoo spot (real vaqt, har tick) */
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

/** Spot API — qo'shimcha manba */
async function fetchSpotGoldApi(): Promise<number | null> {
  const data = await fetchJson<GoldApiResponse>("https://api.gold-api.com/price/XAU", {
    headers: { Accept: "application/json" },
    timeoutMs: 4000,
    retries: 1,
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
  source: string
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
  };
}

/** Har tick — Yahoo real-time + spot (hech qachon eski narxni qaytarmaydi) */
export async function getXAUUSDPriceLive(_prev: PriceData | null): Promise<PriceData> {
  const [yahoo, spot] = await Promise.all([fetchYahooLive(), fetchSpotGoldApi()]);

  if (yahoo && spot) {
    const scale = spot / yahoo.price;
    const live = Math.round(spot * 100) / 100;
    return buildPriceData(
      live,
      Math.round(yahoo.prevClose * scale * 100) / 100,
      yahoo.dayHigh * scale,
      yahoo.dayLow * scale,
      yahoo.time,
      `Spot + Yahoo (${yahoo.symbol})`
    );
  }

  if (yahoo) {
    setYahooReferencePrice(yahoo.price);
    return buildPriceData(
      yahoo.price,
      yahoo.prevClose,
      yahoo.dayHigh,
      yahoo.dayLow,
      yahoo.time,
      `Yahoo ${yahoo.symbol}`
    );
  }

  if (spot) {
    return {
      symbol: "XAUUSD",
      price: spot,
      change: 0,
      changePercent: 0,
      timestamp: new Date().toISOString(),
      source: "Spot API",
    };
  }

  throw new Error("XAUUSD narxi olinmadi — Yahoo va Spot javob bermadi");
}

export async function getXAUUSDPrice(): Promise<PriceData> {
  return getXAUUSDPriceLive(null);
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
