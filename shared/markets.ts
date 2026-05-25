import type { MarketQuote, PriceData } from "./types";
import { fetchJson } from "./fetch-util";
import type { YahooChartResponse } from "./yahoo-api";

const GOLD_DRIVERS = [
  { symbol: "GLD", name: "Oltin ETF" },
  { symbol: "DX-Y.NYB", name: "Dollar indeksi" },
  { symbol: "^TNX", name: "10Y renta" },
  { symbol: "SI=F", name: "Kumush" },
  { symbol: "CL=F", name: "Neft WTI" },
];

async function fetchYahooQuote(
  symbol: string,
  name: string
): Promise<MarketQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const data = await fetchJson<YahooChartResponse>(url, {
    timeoutMs: 8000,
    retries: 0,
  });
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return null;
  const price = meta.regularMarketPrice as number;
  const prev = (meta.chartPreviousClose ?? meta.previousClose ?? price) as number;
  const change =
    typeof meta.regularMarketChange === "number"
      ? (meta.regularMarketChange as number)
      : price - prev;
  const changePercent =
    typeof meta.regularMarketChangePercent === "number"
      ? (meta.regularMarketChangePercent as number)
      : prev
        ? (change / prev) * 100
        : 0;

  return {
    symbol,
    name,
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

/** spotGold — tez tick dan olingan narx (qayta API chaqirmaslik) */
export async function getGoldDrivers(spotGold?: PriceData | null): Promise<MarketQuote[]> {
  const rest = await Promise.all(
    GOLD_DRIVERS.map((d) => fetchYahooQuote(d.symbol, d.name))
  );
  const quotes = rest.filter((q): q is MarketQuote => q !== null);

  if (spotGold) {
    quotes.unshift({
      symbol: "XAUUSD",
      name: "XAUUSD Spot",
      price: spotGold.price,
      change: spotGold.change,
      changePercent: spotGold.changePercent,
    });
  }

  return quotes;
}
