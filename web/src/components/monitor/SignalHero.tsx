import type { SignalDetail } from "../../../../shared/signal-detail";

const statusStyle: Record<string, string> = {
  ready: "ring-2 ring-emerald-400/80 bg-emerald-950/60",
  armed: "ring-2 ring-amber-400/60 bg-amber-950/50",
  wait: "bg-zinc-900/80",
};

const statusLabel: Record<string, string> = {
  ready: "KIRISH TAYYOR",
  armed: "TAYYORGARLIK",
  wait: "KUTISH",
};

interface Props {
  signal: SignalDetail;
  bias: "long" | "short" | "wait";
  confidence: number;
}

export function SignalHero({ signal, bias, confidence }: Props) {
  const actionColor =
    bias === "long"
      ? "text-emerald-400"
      : bias === "short"
        ? "text-red-400"
        : "text-amber-400";

  return (
    <div className={`rounded-xl border border-[var(--term-border)] p-3 ${statusStyle[signal.status]}`}>
      <div className="flex items-start justify-between gap-2">
        <span
          className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
            signal.status === "ready"
              ? "bg-emerald-600 text-white"
              : signal.status === "armed"
                ? "bg-amber-600 text-black"
                : "bg-zinc-600 text-zinc-200"
          }`}
        >
          {statusLabel[signal.status]}
        </span>
        <span className="text-[10px] text-[var(--term-muted)]">{signal.sessionUz}</span>
      </div>

      <p className={`mt-2 font-display text-[17px] font-black leading-tight ${actionColor}`}>
        {signal.actionUz}
      </p>
      <p className="mt-1 text-[11px] font-medium text-[var(--term-cyan)]">{signal.statusUz}</p>

      <div className="mt-3 grid grid-cols-3 gap-1.5 font-mono-ui text-center">
        <div className="rounded-lg bg-black/30 p-2">
          <p className="text-[9px] text-[var(--term-muted)]">KIRISH</p>
          <p className="text-[13px] font-bold text-[var(--term-gold)]">${signal.entryPrice}</p>
          <p className="text-[9px] text-[var(--term-muted)]">
            ${signal.entryFrom}–${signal.entryTo}
          </p>
        </div>
        <div className="rounded-lg bg-red-950/40 p-2">
          <p className="text-[9px] text-[var(--term-muted)]">STOP</p>
          <p className="text-[13px] font-bold text-[var(--term-red)]">${signal.stopLoss}</p>
          <p className="text-[9px] text-[var(--term-muted)]">−{signal.riskPoints}$</p>
        </div>
        <div className="rounded-lg bg-emerald-950/40 p-2">
          <p className="text-[9px] text-[var(--term-muted)]">TAKE PROFIT</p>
          <p className="text-[13px] font-bold text-[var(--term-green)]">${signal.takeProfit}</p>
          <p className="text-[9px] text-[var(--term-muted)]">+{signal.rewardPoints}$</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-[var(--term-muted)]">Signal kuchi</span>
          <span className="font-bold text-[var(--term-gold)]">{signal.signalStrength}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-emerald-500 transition-all"
            style={{ width: `${signal.signalStrength}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-[var(--term-muted)]">TF moslik</span>
          <span className="font-bold text-[var(--term-cyan)]">{signal.confluencePct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-cyan-500/80"
            style={{ width: `${signal.confluencePct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-[var(--term-muted)]">Risk / Foyda</span>
          <span
            className={`font-bold ${signal.riskReward >= 1.5 ? "text-emerald-400" : "text-amber-400"}`}
          >
            1 : {signal.riskReward}
          </span>
        </div>
        <p className="text-[10px] text-[var(--term-muted)]">
          Ishonch {confidence}% · ATR ${signal.atr} · {signal.volatilityUz}
          {signal.inEntryZone && (
            <span className="ml-1 font-bold text-emerald-400"> · ZONADA</span>
          )}
        </p>
      </div>
    </div>
  );
}
