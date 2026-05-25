import type { SignalDetail } from "../../../../shared/signal-detail";

const statusStyle: Record<string, string> = {
  ready: "ring-1 ring-emerald-400/70 bg-emerald-950/50",
  armed: "ring-1 ring-amber-400/50 bg-amber-950/40",
  wait: "bg-zinc-900/60",
};

interface Props {
  signal: SignalDetail;
  bias: "long" | "short" | "wait";
  confidence: number;
  label?: string;
}

export function SignalHeroCompact({ signal, bias, confidence, label }: Props) {
  const color =
    bias === "long" ? "text-emerald-400" : bias === "short" ? "text-red-400" : "text-amber-400";

  return (
    <div className={`rounded-md border border-[var(--term-border)] px-2 py-1.5 ${statusStyle[signal.status]}`}>
      {label && (
        <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--term-muted)]">{label}</span>
      )}
      <p className={`truncate font-display text-[11px] font-black leading-tight ${color}`}>{signal.actionUz}</p>
      <div className="mt-1 grid grid-cols-4 gap-0.5 font-mono-ui text-[8px]">
        <span>
          <span className="text-[var(--term-muted)]">K </span>
          <b className="text-amber-300">${signal.entryPrice}</b>
        </span>
        <span>
          <span className="text-[var(--term-muted)]">SL </span>
          <b className="text-red-400">${signal.stopLoss}</b>
        </span>
        <span>
          <span className="text-[var(--term-muted)]">TP </span>
          <b className="text-emerald-400">${signal.takeProfit}</b>
        </span>
        <span>
          <span className="text-[var(--term-muted)]">R:R </span>
          <b className={signal.riskReward >= 1.8 ? "text-emerald-400" : "text-amber-400"}>
            1:{signal.riskReward}
          </b>
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-[8px]">
        <span className="rounded bg-black/40 px-1">Kuch {signal.signalStrength}%</span>
        <span className="rounded bg-black/40 px-1">TF {signal.confluencePct}%</span>
        <span className="rounded bg-black/40 px-1">Ishonch {confidence}%</span>
        {signal.inEntryZone && (
          <span className="rounded bg-emerald-800 px-1 font-bold text-emerald-100">ZONA</span>
        )}
      </div>
    </div>
  );
}
