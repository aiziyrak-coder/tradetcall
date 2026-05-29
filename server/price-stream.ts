import { getXAUUSDPriceLive } from "../shared/price";
import type { PriceData } from "../shared/types";
import { getMt5PriceData } from "./mt5-bridge";

const FETCH_MS = 1000;

let cached: PriceData | null = null;
let lastFetchAt = 0;
let sessionOpen = 0;

function withSessionChange(mt5: PriceData): PriceData {
  if (sessionOpen <= 0) sessionOpen = mt5.price;
  const change = Math.round((mt5.price - sessionOpen) * 1000) / 1000;
  const changePercent =
    sessionOpen !== 0 ? Math.round((change / sessionOpen) * 10000) / 100 : 0;
  return { ...mt5, change, changePercent };
}

/** Tez tick — MT5 broker narxi birinchi; Yahoo faqat MT5 yo'q bo'lsa */
export async function pullLiveGoldPrice(prev: PriceData | null): Promise<PriceData> {
  const mt5 = getMt5PriceData();
  if (mt5) {
    cached = withSessionChange(mt5);
    return cached;
  }

  const now = Date.now();
  if (cached && cached.feed === "mt5") {
    cached = null;
    sessionOpen = 0;
  }
  if (cached && now - lastFetchAt < FETCH_MS) {
    return cached;
  }

  const fresh = await getXAUUSDPriceLive(prev ?? cached);
  cached = fresh;
  lastFetchAt = now;
  if (sessionOpen <= 0) sessionOpen = fresh.price;
  return fresh;
}

export function peekCachedGoldPrice(): PriceData | null {
  const mt5 = getMt5PriceData();
  if (mt5) {
    cached = withSessionChange(mt5);
    return cached;
  }
  return cached;
}

export function resetPriceStreamSession(): void {
  sessionOpen = 0;
}
