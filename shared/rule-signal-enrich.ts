import type { AiTradeSignal } from "./ai-trade-signal";
import type { SetupQuality } from "./setup-quality";
import type { M1ScalpLead } from "./m1-scalp";
import type { LiveMomentum } from "./scalp-signal-guard";
import { MIN_TP_USD } from "./pip-targets";

/** Claude siz — mahalliy tahlil matni (token 0) */
export function enrichRuleSignal(
  signal: AiTradeSignal,
  input: {
    setupQ: SetupQuality;
    m1Scalp: M1ScalpLead | null;
    live: LiveMomentum;
  }
): AiTradeSignal {
  const dir = signal.action === "BUY" ? "LONG" : "SHORT";
  const m1 = input.m1Scalp;
  const parts = [
    `${dir} — qoida signali (tejamkor rejim).`,
    `Setup ${input.setupQ.score}/100, long ${input.setupQ.longScore} / short ${input.setupQ.shortScore}.`,
    m1 ? `M1 ${m1.direction} ${m1.strength}% · ${m1.structureUz}` : "",
    input.live.summaryUz,
    `Maqsad +$${MIN_TP_USD} (narx farqi), kirish hozirgi narx.`,
  ].filter(Boolean);

  return {
    ...signal,
    analysisUz: parts.join(" ").slice(0, 500),
    triggerUz: signal.triggerUz.slice(0, 200),
    summaryUz: `${signal.action} · ${signal.summaryUz}`.slice(0, 280),
  };
}
