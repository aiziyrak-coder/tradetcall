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
          { label: "TP", price: takeProfit, color: "bg-emerald-500", glow: "ladder-tp" },
          { label: "Kirish", price: entry, color: "bg-amber-500", glow: "ladder-entry" },
          { label: "Hozir", price: current, color: "bg-cyan-400", glow: "ladder-now" },
          { label: "SL", price: stopLoss, color: "bg-red-500", glow: "ladder-sl" },
        ]
      : [
          { label: "SL", price: stopLoss, color: "bg-red-500", glow: "ladder-sl" },
          { label: "Kirish", price: entry, color: "bg-amber-500", glow: "ladder-entry" },
          { label: "Hozir", price: current, color: "bg-cyan-400", glow: "ladder-now" },
          { label: "TP", price: takeProfit, color: "bg-emerald-500", glow: "ladder-tp" },
        ];

  const all = points.map((p) => p.price);
  const min = Math.min(...all) - 0.5;
  const max = Math.max(...all) + 0.5;
  const range = max - min || 1;
  const pos = (p: number) => `${((max - p) / range) * 100}%`;

  const inZone = Math.abs(current - entry) <= Math.max(0.5, Math.abs(entry - stopLoss) * 0.15);
  const progress =
    action === "BUY"
      ? Math.min(100, Math.max(0, ((current - stopLoss) / (takeProfit - stopLoss)) * 100))
      : Math.min(100, Math.max(0, ((stopLoss - current) / (stopLoss - takeProfit)) * 100));

  return (
    <div className="price-ladder empire-card-glow rounded-md border border-[var(--term-border)] bg-black/40 p-2">
      <div className="relative mb-2 h-20 rounded bg-[var(--term-bg)] overflow-hidden">
        <div
          className="ladder-progress absolute bottom-0 left-0 top-0 w-0.5 bg-gradient-to-b from-cyan-400/80 to-violet-500/60 transition-all duration-500"
          style={{ left: `${progress}%` }}
        />
        {points.map((p) => (
          <div
            key={p.label}
            className={`absolute left-0 right-0 flex items-center gap-1 border-t border-dashed border-white/10 px-1 ${p.glow}`}
            style={{ top: pos(p.price) }}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.color}`} />
            <span className="text-[7px] font-bold text-[var(--term-muted)]">{p.label}</span>
            <span className="ml-auto font-mono-ui text-[8px] text-slate-200">${p.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <p
        className={`text-center text-[8px] font-bold transition-colors ${
          inZone ? "text-emerald-400 empire-live-pulse" : "text-amber-400"
        }`}
      >
        {inZone ? "✓ Kirish zonasida" : `Kirishgacha $${Math.abs(current - entry).toFixed(2)}`}
      </p>
    </div>
  );
}
