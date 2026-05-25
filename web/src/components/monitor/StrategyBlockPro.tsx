import type { LongTermForecast, LongTermStrategy, ShortTermStrategy } from "../../../../shared/types";
import { HorizonVerdictPanel } from "./HorizonVerdictPanel";

interface LongProps {
  strategy: LongTermStrategy | null;
  forecast: LongTermForecast | null;
  price: number;
  onForecast?: () => void;
  forecastLoading?: boolean;
  hasApiKey?: boolean;
}

export function LongStrategyBlock({
  strategy,
  forecast,
  onForecast,
  forecastLoading,
  hasApiKey,
}: LongProps) {
  if (!strategy?.verdict) {
    return <p className="text-[9px] text-[var(--term-muted)]">Uzoq muddat yuklanmoqda…</p>;
  }

  const v = strategy.verdict;
  const forecastOverride = forecast
    ? {
        ...v,
        forecastUz: [forecast.summaryUz, forecast.weekPlanUz, forecast.riskWarning]
          .filter(Boolean)
          .join(" "),
      }
    : v;

  return (
    <HorizonVerdictPanel verdict={forecastOverride} signal={strategy.signal} accent="amber">
      {onForecast && (
        <button
          type="button"
          onClick={onForecast}
          disabled={forecastLoading || !hasApiKey}
          className="w-full rounded bg-amber-900/50 py-0.5 text-[8px] font-bold text-amber-200 disabled:opacity-40"
        >
          {forecastLoading ? "AI bashorat…" : "AI bashorat yangilash"}
        </button>
      )}
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
