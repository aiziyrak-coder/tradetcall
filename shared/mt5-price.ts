import { roundGoldPrice } from "./gold-price";
import type { Mt5TickPayload } from "./mt5-types";
import type { PriceData } from "./types";

/** @param receivedAtIso — server qabul vaqti (staleness uchun) */
export function priceDataFromMt5Tick(
  tick: Mt5TickPayload,
  receivedAtIso?: string
): PriceData {
  const bid = roundGoldPrice(tick.bid);
  const ask = roundGoldPrice(tick.ask);
  const mid = roundGoldPrice((bid + ask) / 2);
  const spread = roundGoldPrice(ask - bid);
  return {
    symbol: tick.symbol || "XAUUSD",
    price: mid,
    bid,
    ask,
    spread,
    change: 0,
    changePercent: 0,
    timestamp: receivedAtIso ?? new Date().toISOString(),
    source: tick.broker ? `MT5 · ${tick.broker}` : "MT5 Live",
    feed: "mt5",
  };
}
