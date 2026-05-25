import { useState } from "react";
import type { LongTermForecast, LongTermStrategy, ShortTermStrategy } from "../../../../shared/types";
import { LongStrategyBlock, ShortStrategyBlock } from "./StrategyBlockPro";

type StrategyTab = "long" | "short";

interface Props {
  longStrategy: LongTermStrategy | null;
  shortStrategy: ShortTermStrategy | null;
  forecast: LongTermForecast | null;
  forecastLoading: boolean;
  hasApiKey: boolean;
  price: number;
  onForecast: () => void;
}

const actionChip: Record<string, string> = {
  BUY: "bg-emerald-600/90 text-white",
  SELL: "bg-red-600/90 text-white",
  HOLD: "bg-amber-700/90 text-amber-100",
};

export function StrategiesStackPanel({
  longStrategy,
  shortStrategy,
  forecast,
  forecastLoading,
  hasApiKey,
  price,
  onForecast,
}: Props) {
  const [tab, setTab] = useState<StrategyTab>("short");

  const longAction = longStrategy?.verdict?.action ?? "HOLD";
  const shortAction = shortStrategy?.verdict?.action ?? "HOLD";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-amber-500/30 bg-[var(--term-panel)]">
      <div className="shrink-0 border-b border-[var(--term-border)] bg-[var(--term-panel-2)] px-2 py-1">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-[var(--term-gold)]">
          Strategiyalar
        </h2>
        <div className="mt-1 flex gap-1">
          <button
            type="button"
            onClick={() => setTab("long")}
            className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[9px] font-bold uppercase transition ${
              tab === "long"
                ? "bg-amber-900/80 text-amber-100 ring-1 ring-amber-500/60"
                : "bg-zinc-900/60 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Uzoq
            <span className={`rounded px-1 py-0 text-[7px] ${actionChip[longAction]}`}>
              {longAction}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("short")}
            className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[9px] font-bold uppercase transition ${
              tab === "short"
                ? "bg-cyan-950/80 text-cyan-100 ring-1 ring-cyan-500/50"
                : "bg-zinc-900/60 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Yaqin
            <span className={`rounded px-1 py-0 text-[7px] ${actionChip[shortAction]}`}>
              {shortAction}
            </span>
          </button>
        </div>
      </div>
      <div className="term-scroll min-h-0 flex-1 px-2 py-1.5">
        {tab === "long" ? (
          <LongStrategyBlock
            strategy={longStrategy}
            forecast={forecast}
            price={price}
            onForecast={onForecast}
            forecastLoading={forecastLoading}
            hasApiKey={hasApiKey}
          />
        ) : (
          <ShortStrategyBlock strategy={shortStrategy} />
        )}
      </div>
    </div>
  );
}
