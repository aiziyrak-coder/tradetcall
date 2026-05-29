import type { AiPhase } from "../../../../shared/ai-trade-signal";
import { UZ } from "../../lib/uz";

interface Props {
  phase: AiPhase;
  busy?: boolean;
}

export function MonitorStatusStrip({ phase, busy }: Props) {
  if (busy || phase === "analyzing" || phase === "ready") return null;

  return (
    <div className="monitor-status-strip shrink-0 border-b border-violet-500/20 bg-gradient-to-r from-violet-950/60 via-[var(--term-panel-2)] to-violet-950/40 px-3 py-1 text-center">
      <p className="text-[9px] text-violet-100/90">
        <span className="font-bold text-violet-300">{UZ.monitorForecast}</span>
        {" — "}
        Aniq setupda{" "}
        <span className="text-[var(--term-gold)]">min 10 pip</span> skalp BUY / SELL
      </p>
    </div>
  );
}
