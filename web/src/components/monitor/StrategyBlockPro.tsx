import type { LongTermStrategy, ShortTermStrategy } from "../../../../shared/types";
import { HorizonVerdictPanel } from "./HorizonVerdictPanel";

interface LongProps {
  strategy: LongTermStrategy | null;
  tradingAllowed?: boolean;
  disciplineScore?: number;
}

export function LongStrategyBlock({ strategy, tradingAllowed, disciplineScore }: LongProps) {
  if (!strategy?.verdict) {
    return <p className="text-[9px] text-[var(--term-muted)]">Uzoq muddat yuklanmoqda…</p>;
  }

  return (
    <HorizonVerdictPanel
      verdict={strategy.verdict}
      signal={strategy.signal}
      accent="amber"
      horizon="long"
      tradingAllowed={tradingAllowed}
      disciplineScore={disciplineScore}
    >
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
  tradingAllowed?: boolean;
  disciplineScore?: number;
}

export function ShortStrategyBlock({ strategy, tradingAllowed, disciplineScore }: ShortProps) {
  if (!strategy?.verdict) {
    return <p className="text-[9px] text-[var(--term-muted)]">Yaqin muddat yuklanmoqda…</p>;
  }

  return (
    <HorizonVerdictPanel
      verdict={strategy.verdict}
      signal={strategy.signal}
      accent="cyan"
      horizon="short"
      maxHoldMinutes={strategy.maxHoldMinutes}
      tradingAllowed={tradingAllowed}
      disciplineScore={disciplineScore}
    >
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
