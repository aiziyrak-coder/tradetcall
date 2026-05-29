import { pullLiveGoldPrice } from "./price-stream";

export { pullLiveGoldPrice } from "./price-stream";

/** @deprecated price-stream.pullLiveGoldPrice ishlating */
export async function getBestGoldPrice(prev: import("../shared/types").PriceData | null) {
  return pullLiveGoldPrice(prev);
}
