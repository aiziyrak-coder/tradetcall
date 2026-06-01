import type { AiTradeSignal } from "./ai-trade-signal";
import type { TradeLevels } from "./forecast-levels";

/** Matn allaqachon forecast da — qo'shimcha boyitish shart emas */
export function enrichRuleSignal(signal: AiTradeSignal, _forecast: TradeLevels): AiTradeSignal {
  return signal;
}
