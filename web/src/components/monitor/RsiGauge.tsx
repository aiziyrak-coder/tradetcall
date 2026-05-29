interface Props {
  rsi: number;
  compact?: boolean;
}

export function RsiGauge({ rsi, compact }: Props) {
  const clamped = Math.max(0, Math.min(100, rsi));
  const zone =
    clamped >= 70 ? "overbought" : clamped <= 30 ? "oversold" : "neutral";
  const barColor =
    zone === "overbought"
      ? "bg-red-500"
      : zone === "oversold"
        ? "bg-emerald-500"
        : "bg-cyan-500";

  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      <div className="flex items-center justify-between text-[8px]">
        <span className="text-[var(--term-muted)]">RSI</span>
        <span
          className={`font-mono-ui font-bold ${
            zone === "overbought"
              ? "text-red-400"
              : zone === "oversold"
                ? "text-emerald-400"
                : "text-cyan-300"
          }`}
        >
          {clamped}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {!compact && (
        <p className="text-[7px] text-[var(--term-muted)]">
          {zone === "overbought" ? "Haddan yuqori" : zone === "oversold" ? "Haddan past" : "Normal zona"}
        </p>
      )}
    </div>
  );
}
