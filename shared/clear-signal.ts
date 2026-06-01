/**
 * @deprecated — forecast-levels.ts ishlating
 */
export { computeMarketForecast, tradeLevelsToAiSignal } from "./forecast-levels";
export type { TradeLevels } from "./forecast-levels";

import type { SetupQuality } from "./setup-quality";
import type { M1ScalpLead } from "./m1-scalp";
import type { LiveMomentum } from "./scalp-signal-guard";
import type { TechnicalAnalysis } from "./types";
import type { AiTradeSignal } from "./ai-trade-signal";
import { computeMarketForecast, tradeLevelsToAiSignal } from "./forecast-levels";

export function deriveClearSignal(input: {
  price: number;
  tech: TechnicalAnalysis;
  tech5: TechnicalAnalysis;
  setupQ: SetupQuality;
  m1Scalp: M1ScalpLead | null;
  live: LiveMomentum;
}): AiTradeSignal | null {
  const f = computeMarketForecast({
    price: input.price,
    tech1: input.tech,
    tech5: input.tech5,
    setupQ: input.setupQ,
    m1Scalp: input.m1Scalp,
    live: input.live,
  });
  return tradeLevelsToAiSignal(f, input.price);
}

export function minConfidenceForSetup(score: number): number {
  if (score >= 62) return 52;
  if (score >= 50) return 55;
  if (score >= 42) return 58;
  return 62;
}
