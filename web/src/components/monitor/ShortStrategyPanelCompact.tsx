import type { NewsMarketAnalysis, ShortTermStrategy } from "../../../../shared/types";
import { PanelShell } from "./PanelShell";
import { SignalHeroCompact } from "./SignalHeroCompact";

interface Props {
  strategy: ShortTermStrategy | null;
  currentPrice: number;
  newsAnalysis?: NewsMarketAnalysis | null;
}

const chip: Record<string, string> = {
  long: "bg-emerald-700 text-white",
  short: "bg-red-700 text-white",
  neutral: "bg-zinc-700 text-zinc-400",
};

export function ShortStrategyPanelCompact({ strategy }: Props) {
  if (!strategy) {
    return (
      <PanelShell compact title="QISQA" accent="cyan">
        <p className="text-center text-[9px] text-[var(--term-muted)]">…</p>
      </PanelShell>
    );
  }

  const { signal } = strategy;

  return (
    <PanelShell compact title="QISQA 30daq" subtitle={`${strategy.tfAligned}/4 TF`} accent="cyan">
      <div className="space-y-1.5">
        <SignalHeroCompact signal={signal} bias={strategy.bias} confidence={strategy.confidence} label="TEZ" />
        <div className="flex flex-wrap gap-0.5">
          {strategy.timeframes.map((tf) => (
            <span
              key={tf.interval}
              className={`rounded px-1 py-0 text-[7px] font-bold ${chip[tf.bias]}`}
              title={`RSI ${tf.rsi} ${tf.trend}`}
            >
              {tf.labelUz}: {tf.bias === "long" ? "L" : tf.bias === "short" ? "S" : "—"}
            </span>
          ))}
        </div>
        <p className="line-clamp-2 text-[8px] leading-snug text-[var(--term-text-2)]">{strategy.situationUz}</p>
      </div>
    </PanelShell>
  );
}
