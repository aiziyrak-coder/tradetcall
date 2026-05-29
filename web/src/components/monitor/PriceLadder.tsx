import type { AiTradeAction } from "../../../../shared/ai-trade-signal";

interface Props {
  current: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  action: AiTradeAction;
}

export function PriceLadder({ current, entry, stopLoss, takeProfit, action }: Props) {
  const points =
    action === "SELL"
      ? [
          { label: "TP", price: takeProfit, color: "bg-emerald-500" },
          { label: "Kirish", price: entry, color: "bg-amber-500" },
          { label: "Hozir", price: current, color: "bg-cyan-400" },
          { label: "SL", price: stopLoss, color: "bg-red-500" },
        ]
      : [
          { label: "SL", price: stopLoss, color: "bg-red-500" },
          { label: "Kirish", price: entry, color: "bg-amber-500" },
          { label: "Hozir", price: current, color: "bg-cyan-400" },
          { label: "TP", price: takeProfit, color: "bg-emerald-500" },
        ];

  const all = points.map((p) => p.price);
  const min = Math.min(...all) - 0.5;
  const max = Math.max(...all) + 0.5;
  const range = max - min || 1;
  const pos = (p: number) => `${((max - p) / range) * 100}%`;

  const inZone = Math.abs(current - entry) <= Math.max(0.5, Math.abs(entry - stopLoss) * 0.15);

  return (
    <div className="price-ladder rounded-md border border-[var(--term-border)] bg-black/35 p-2">
      <div className="relative mb-2 h-16 rounded bg-[var(--term-bg)]">
        {points.map((p) => (
          <div
            key={p.label}
            className="absolute left-0 right-0 flex items-center gap-1 border-t border-dashed border-white/10 px-1"
            style={{ top: pos(p.price) }}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.color}`} />
            <span className="text-[7px] font-bold text-[var(--term-muted)]">{p.label}</span>
            <span className="ml-auto font-mono-ui text-[8px] text-slate-200">${p.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <p className={`text-center text-[8px] font-semibold ${inZone ? "text-emerald-400" : "text-amber-400"}`}>
        {inZone ? "✓ Kirish zonasida" : `Kirishgacha $${Math.abs(current - entry).toFixed(2)}`}
      </p>
    </div>
  );
}
