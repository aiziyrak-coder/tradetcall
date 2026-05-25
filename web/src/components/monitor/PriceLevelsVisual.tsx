import type { SignalDetail } from "../../../../shared/signal-detail";

interface Props {
  currentPrice: number;
  signal: SignalDetail;
}

export function PriceLevelsVisual({ currentPrice, signal }: Props) {
  const prices = [
    signal.takeProfit,
    signal.entryTo,
    signal.entryPrice,
    currentPrice,
    signal.entryFrom,
    signal.stopLoss,
  ];
  const min = Math.min(...prices) - 0.5;
  const max = Math.max(...prices) + 0.5;
  const range = max - min || 1;

  const pos = (p: number) => `${((max - p) / range) * 100}%`;

  const rows = [
    { label: "TP", price: signal.takeProfit, color: "text-emerald-400" },
    { label: "Kirish yuqori", price: signal.entryTo, color: "text-amber-300/80" },
    { label: "Kirish", price: signal.entryPrice, color: "text-[var(--term-gold)]" },
    { label: "HOZIR", price: currentPrice, color: "text-[var(--term-cyan)]", bold: true },
    { label: "Kirish past", price: signal.entryFrom, color: "text-amber-300/80" },
    { label: "SL", price: signal.stopLoss, color: "text-red-400" },
  ];

  return (
    <div className="rounded-lg border border-[var(--term-border)] bg-black/25 p-2.5">
      <p className="mb-2 text-[10px] font-bold uppercase text-[var(--term-muted)]">
        Narx darajalari (grafik)
      </p>
      <div className="relative mb-2 h-24 rounded bg-[var(--term-bg)]">
        <div
          className="absolute left-0 right-0 border-t border-dashed border-amber-500/40"
          style={{ top: pos(signal.entryTo) }}
        />
        <div
          className="absolute left-0 right-0 border-t border-amber-500/60"
          style={{ top: pos(signal.entryFrom) }}
        />
        <div
          className="absolute left-0 right-0 border-t-2 border-cyan-400"
          style={{ top: pos(currentPrice) }}
        />
        <div
          className="absolute left-0 right-0 border-t border-red-500/70"
          style={{ top: pos(signal.stopLoss) }}
        />
        <div
          className="absolute left-0 right-0 border-t border-emerald-500/70"
          style={{ top: pos(signal.takeProfit) }}
        />
      </div>
      <div className="space-y-1 font-mono-ui">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between text-[11px]">
            <span className={r.color + (r.bold ? " font-bold" : "")}>{r.label}</span>
            <span className={`font-semibold ${r.color}`}>${r.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
