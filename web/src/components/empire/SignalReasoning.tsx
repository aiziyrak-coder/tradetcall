import type { MonitorSnapshot } from "../../../../shared/types";
import type { AiTradeSignal } from "../../../../shared/ai-trade-signal";
import { buildSignalReasoning } from "../../../../shared/signal-reasons";
import { GlassCard } from "./GlassCard";

interface Props {
  data: MonitorSnapshot | null;
  signal: AiTradeSignal | null;
}

const stanceIcon: Record<string, string> = {
  pro: "✓",
  con: "✕",
  neutral: "•",
};

export function SignalReasoning({ data, signal }: Props) {
  const reasoning = buildSignalReasoning({
    signal,
    technical: data?.marketTechnical,
    news: data?.newsAnalysis,
    setup: data?.setupQuality,
    gold: data?.gold,
  });

  if (!signal || !reasoning) return null;

  return (
    <GlassCard className="empire-card empire-reason p-3">
      <div className="empire-reason__head">
        <p className="empire-card-title">SIGNAL ASOSI</p>
        <span className={`empire-reason__action empire-reason__action--${reasoning.action.toLowerCase()}`}>
          {reasoning.action}
        </span>
      </div>

      <p className="empire-reason__headline">{reasoning.headlineUz}</p>

      <div className="empire-reason__tally">
        <span className="empire-reason__tally-pro">✓ {reasoning.proCount} tasdiq</span>
        <span className="empire-reason__tally-con">✕ {reasoning.conCount} qarshi</span>
      </div>

      <ul className="empire-reason__list">
        {reasoning.reasons.map((r, i) => (
          <li key={i} className={`empire-reason__item empire-reason__item--${r.stance}`}>
            <span className="empire-reason__icon">{stanceIcon[r.stance]}</span>
            <span className="empire-reason__label">{r.labelUz}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
