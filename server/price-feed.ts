import { getXAUUSDPriceLive } from "../shared/price";
import type { PriceData } from "../shared/types";
import { getMt5PriceData } from "./mt5-bridge";

/** MT5 broker tick birinchi, keyin Yahoo+spot */
export async function getBestGoldPrice(prev: PriceData | null): Promise<PriceData> {
  const mt5 = getMt5PriceData();
  if (mt5) {
    if (prev && prev.feed === "mt5" && prev.price > 0) {
      const change = Math.round((mt5.price - prev.price) * 100) / 100;
      const changePercent =
        prev.price !== 0 ? Math.round((change / prev.price) * 10000) / 100 : 0;
      return { ...mt5, change, changePercent };
    }
    return mt5;
  }
  return getXAUUSDPriceLive(prev);
}
