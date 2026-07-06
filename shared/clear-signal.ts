/**
 * @deprecated — forecast-levels.ts ishlating
 */
export { computeMarketForecast, tradeLevelsToAiSignal } from "./forecast-levels";
export type { TradeLevels } from "./forecast-levels";

import type { SetupQuality } from "./setup-quality";

export function minConfidenceForSetup(score: number): number {
  if (score >= 72) return 52;
  if (score >= 62) return 55;
  if (score >= 52) return 58;
  if (score >= 42) return 60;
  return 65;
}

/** @deprecated */
export function deriveClearSignal(_input: {
  price: number;
  tech: unknown;
  tech5: unknown;
  setupQ: SetupQuality;
  m1Scalp: unknown;
  live: unknown;
}): null {
  return null;
}
