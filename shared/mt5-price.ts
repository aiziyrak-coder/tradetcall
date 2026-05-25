import type { Mt5TickPayload } from "./mt5-types";
import type { PriceData } from "./types";

export function priceDataFromMt5Tick(tick: Mt5TickPayload): PriceData {
  const bid = Math.round(tick.bid * 100) / 100;
  const ask = Math.round(tick.ask * 100) / 100;
  const mid = Math.round(((bid + ask) / 2) * 100) / 100;
  const spread = Math.round((ask - bid) * 100) / 100;
  const t = tick.time ?? Math.floor(Date.now() / 1000);
  return {
    symbol: tick.symbol || "XAUUSD",
    price: mid,
    bid,
    ask,
    spread,
    change: 0,
    changePercent: 0,
    timestamp: new Date(t * 1000).toISOString(),
    source: tick.broker ? `MT5 · ${tick.broker}` : "MT5 Live",
    feed: "mt5",
  };
}
