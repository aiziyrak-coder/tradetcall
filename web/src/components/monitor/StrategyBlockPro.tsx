import type { LongTermStrategy, ShortTermStrategy } from "../../../../shared/types";
import { HorizonVerdictPanel } from "./HorizonVerdictPanel";

interface LongProps {
  strategy: LongTermStrategy | null;
}

export function LongStrategyBlock({ strategy }: LongProps) {
  if (!strategy?.verdict) {
    return <p className="text-[9px] text-[var(--term-muted)]">Uzoq muddat yuklanmoqda…</p>;
  }

  return (
    <HorizonVerdictPanel verdict={strategy.verdict} signal={strategy.signal} accent="amber">
      <div className="flex flex-wrap gap-0.5 font-mono-ui text-[7px]">
        {strategy.keyLevels.map((k) => (
          <span key={k.label} className="rounded bg-zinc-900/80 px-1 py-0 text-zinc-400">
            {k.label} <b className="text-amber-200">${k.price}</b>
          </span>
        ))}
      </div>
    </HorizonVerdictPanel>
  );
}

interface ShortProps {
  strategy: ShortTermStrategy | null;
}

export function ShortStrategyBlock({ strategy }: ShortProps) {
  if (!strategy?.verdict) {
    return <p className="text-[9px] text-[var(--term-muted)]">Yaqin muddat yuklanmoqda…</p>;
  }

  return (
    <HorizonVerdictPanel verdict={strategy.verdict} signal={strategy.signal} accent="cyan">
      <div className="flex flex-wrap gap-0.5">
        {strategy.timeframes.map((tf) => (
          <span
            key={tf.interval}
            className={`rounded px-1 py-0 text-[7px] font-bold ${
              tf.bias === "long"
                ? "bg-emerald-800 text-white"
                : tf.bias === "short"
                  ? "bg-red-800 text-white"
                  : "bg-zinc-700 text-zinc-400"
            }`}
          >
            {tf.labelUz.split(" ")[0]} {tf.bias === "long" ? "L" : tf.bias === "short" ? "S" : "—"}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-0.5 font-mono-ui text-[7px]">
        {strategy.keyLevels.map((k) => (
          <span key={k.label} className="rounded bg-zinc-900/80 px-1 py-0 text-zinc-400">
            {k.label} <b className="text-cyan-200">${k.price}</b>
          </span>
        ))}
      </div>
    </HorizonVerdictPanel>
  );
}
