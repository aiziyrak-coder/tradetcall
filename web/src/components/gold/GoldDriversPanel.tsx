import type { MarketQuote } from "../../../../shared/types";
import { UZ } from "../../lib/uz";

interface Props {
  drivers: MarketQuote[];
}

export function GoldDriversPanel({ drivers }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col term-panel">
      <div className="shrink-0 border-b border-[var(--term-border)] px-2 py-1.5">
        <p className="text-[10px] font-semibold text-[var(--term-gold)]">{UZ.drivers.title}</p>
        <p className="text-[9px] text-[var(--term-muted)]">{UZ.drivers.hint}</p>
      </div>
      <div className="term-scroll min-h-0 flex-1 space-y-1 p-1.5">
        {drivers.map((d) => {
          const up = d.changePercent >= 0;
          const inverse = d.name.includes("Dollar") || d.name.includes("renta");
          const goodForGold = inverse ? !up : up;
          return (
            <div
              key={d.symbol}
              className={`rounded-md border px-2 py-1 ${
                goodForGold
                  ? "border-emerald-500/30 bg-emerald-950/40"
                  : "border-red-500/30 bg-red-950/40"
              }`}
            >
              <p className="truncate text-[9px] font-medium text-[var(--term-cyan)]">{d.name}</p>
              <div className="flex items-baseline justify-between gap-1">
                <p className="font-mono-ui text-[12px] font-semibold text-[var(--term-text)]">
                  {d.price > 500
                    ? d.price.toLocaleString(undefined, { maximumFractionDigits: 1 })
                    : d.price.toFixed(2)}
                </p>
                <p
                  className={`text-[10px] font-semibold ${up ? "text-[var(--term-green)]" : "text-[var(--term-red)]"}`}
                >
                  {up ? "+" : ""}
                  {d.changePercent}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
