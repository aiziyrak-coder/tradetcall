import type { MarketQuote } from "../../../../shared/types";

interface Props {
  drivers: MarketQuote[];
}

export function DriversStrip({ drivers }: Props) {
  if (!drivers.length) return null;

  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-[var(--term-border)]/50 px-2 py-0.5">
      <span className="shrink-0 text-[7px] font-bold uppercase text-[var(--term-muted)]">Drayver</span>
      {drivers.slice(0, 6).map((d) => {
        const up = d.changePercent >= 0;
        const inverse = /dollar|renta/i.test(d.name);
        const good = inverse ? !up : up;
        return (
          <span
            key={d.symbol}
            className={`shrink-0 rounded px-1 py-0 font-mono-ui text-[7px] ${
              good ? "bg-emerald-950/60 text-emerald-300" : "bg-red-950/50 text-red-300"
            }`}
            title={d.name}
          >
            {d.name.split(" ")[0]} {up ? "+" : ""}
            {d.changePercent}%
          </span>
        );
      })}
    </div>
  );
}
