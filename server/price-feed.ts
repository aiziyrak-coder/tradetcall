import { pullLiveGoldPrice } from "./price-stream";
export { pullLiveGoldPrice } from "./price-stream";
import { getMt5PriceData } from "./mt5-bridge";

/** @deprecated price-stream.pullLiveGoldPrice ishlating */
export async function getBestGoldPrice(prev: import("../shared/types").PriceData | null) {
  return pullLiveGoldPrice(prev);
}

export { getMt5PriceData };
