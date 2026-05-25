import type { MarketFlow } from "../../../../shared/types";

interface Props {
  flow: MarketFlow | null;
}

export function MarketFlowBar({ flow }: Props) {
  if (!flow) {
    return (
      <div className="rounded border border-[var(--term-border)] bg-black/30 px-2 py-1 text-[9px] text-[var(--term-muted)]">
        Order flow yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="rounded border border-[var(--term-border)] bg-black/30 px-2 py-1.5">
      <div className="mb-1 flex items-center justify-between text-[8px]">
        <span className="font-bold uppercase text-cyan-400">Bozor hajmi (BUY / SELL)</span>
        <span className="text-[var(--term-muted)]">{flow.windowUz}</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="bg-emerald-500 transition-all duration-500"
          style={{ width: `${flow.buyPct}%` }}
          title={`BUY ${flow.buyPct}%`}
        />
        <div
          className="bg-red-500 transition-all duration-500"
          style={{ width: `${flow.sellPct}%` }}
          title={`SELL ${flow.sellPct}%`}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono-ui text-[9px]">
        <span className="font-bold text-emerald-400">BUY {flow.buyPct}%</span>
        <span
          className={
            flow.pressure === "buy"
              ? "text-emerald-400"
              : flow.pressure === "sell"
                ? "text-red-400"
                : "text-amber-300"
          }
        >
          Δ {flow.delta >= 0 ? "+" : ""}
          {flow.delta}
        </span>
        <span className="font-bold text-red-400">SELL {flow.sellPct}%</span>
      </div>
      <p className="mt-0.5 text-[8px] text-[var(--term-text-2)]">{flow.labelUz}</p>
    </div>
  );
}
