import { getXAUUSDPriceLive } from "../shared/price";
import type { PriceData } from "../shared/types";
import { getMt5PriceData } from "./mt5-bridge";

const FETCH_MS = 1000;

let cached: PriceData | null = null;
let lastFetchAt = 0;
let sessionOpen = 0;

/** Tez tick — MT5 yoki kesh; Yahoo ~1s */
export async function pullLiveGoldPrice(prev: PriceData | null): Promise<PriceData> {
  const mt5 = getMt5PriceData();
  if (mt5) {
    if (sessionOpen <= 0) sessionOpen = mt5.price;
    const change = Math.round((mt5.price - sessionOpen) * 100) / 100;
    const changePercent =
      sessionOpen !== 0 ? Math.round((change / sessionOpen) * 10000) / 100 : 0;
    cached = {
      ...mt5,
      change,
      changePercent,
      timestamp: new Date().toISOString(),
    };
    return cached;
  }

  const now = Date.now();
  if (cached && now - lastFetchAt < FETCH_MS) {
    return {
      ...cached,
      timestamp: new Date().toISOString(),
    };
  }

  const fresh = await getXAUUSDPriceLive(prev ?? cached);
  cached = fresh;
  lastFetchAt = now;
  if (sessionOpen <= 0) sessionOpen = fresh.price;
  return fresh;
}

export function peekCachedGoldPrice(): PriceData | null {
  const mt5 = getMt5PriceData();
  if (mt5) return { ...mt5, timestamp: new Date().toISOString() };
  return cached ? { ...cached, timestamp: new Date().toISOString() } : null;
}
