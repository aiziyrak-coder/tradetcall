import { getXAUUSDPriceLive } from "../shared/price";
import type { PriceData } from "../shared/types";
import {
  getTradingViewPrice,
  isTradingViewPriceFresh,
  onTradingViewTick,
} from "./tradingview-price";
import {
  getFinnhubPrice,
  isFinnhubPriceFresh,
  onFinnhubTick,
} from "./finnhub-price";

const FETCH_MS = 900;

let cached: PriceData | null = null;
let lastFetchAt = 0;
let sessionOpen = 0;
let lastTickPrice = 0;
let tvUnsub: (() => void) | null = null;
let fhUnsub: (() => void) | null = null;

function withSessionChange(pd: PriceData): PriceData {
  if (sessionOpen <= 0) sessionOpen = pd.price;
  const tickDelta =
    lastTickPrice > 0 ? Math.round((pd.price - lastTickPrice) * 100) / 100 : 0;
  lastTickPrice = pd.price;

  let change = pd.change;
  let changePercent = pd.changePercent;
  if (pd.feed === "tradingview" || pd.feed === "finnhub" || Math.abs(change) < 0.001) {
    change = Math.round((pd.price - sessionOpen) * 100) / 100;
    changePercent =
      sessionOpen !== 0 ? Math.round((change / sessionOpen) * 10000) / 100 : 0;
  }

  return {
    ...pd,
    change,
    changePercent,
    tickDelta,
  };
}

export function initPriceStreamHooks(onTick: () => void): void {
  if (tvUnsub) tvUnsub();
  if (fhUnsub) fhUnsub();
  tvUnsub = onTradingViewTick(onTick);
  fhUnsub = onFinnhubTick(onTick);
}

export function disposePriceStreamHooks(): void {
  if (tvUnsub) {
    tvUnsub();
    tvUnsub = null;
  }
  if (fhUnsub) {
    fhUnsub();
    fhUnsub = null;
  }
}

/**
 * Prioritet: TradingView → Finnhub (ixtiyoriy) → spot/Yahoo REST.
 * Klient faqat tayyor PriceData oladi.
 */
export async function pullLiveGoldPrice(_prev: PriceData | null): Promise<PriceData> {
  const tv = getTradingViewPrice();
  if (tv) {
    cached = withSessionChange(tv);
    return cached;
  }

  const fh = getFinnhubPrice();
  if (fh && isFinnhubPriceFresh()) {
    cached = withSessionChange(fh);
    return cached;
  }

  const now = Date.now();
  if (cached?.feed === "tradingview" && !isTradingViewPriceFresh()) {
    cached = null;
    sessionOpen = 0;
  }
  if (
    cached &&
    cached.feed !== "tradingview" &&
    cached.feed !== "finnhub" &&
    now - lastFetchAt < FETCH_MS
  ) {
    return cached;
  }

  const fresh = await getXAUUSDPriceLive();
  cached = withSessionChange(fresh);
  lastFetchAt = now;
  if (sessionOpen <= 0) sessionOpen = fresh.price;
  return cached;
}

export function peekCachedGoldPrice(): PriceData | null {
  const tv = getTradingViewPrice();
  if (tv) {
    cached = withSessionChange(tv);
    return cached;
  }
  const fh = getFinnhubPrice();
  if (fh && isFinnhubPriceFresh()) {
    cached = withSessionChange(fh);
    return cached;
  }
  return cached;
}
