import { useMemo, useState } from "react";
import type { SignalDetail } from "../../../../shared/signal-detail";
import { calcPositionSize } from "../../../../shared/risk-calculator";

interface Props {
  signal: SignalDetail;
  label?: string;
}

export function RiskCalculatorCompact({ signal, label = "Risk" }: Props) {
  const [account, setAccount] = useState(1000);
  const [riskPct, setRiskPct] = useState(1);

  const result = useMemo(
    () =>
      calcPositionSize({
        accountUsd: account,
        riskPercent: riskPct,
        entry: signal.entryPrice,
        stopLoss: signal.stopLoss,
      }),
    [account, riskPct, signal.entryPrice, signal.stopLoss]
  );

  if (signal.status === "wait" && signal.riskPoints <= 0) return null;

  return (
    <div className="rounded border border-[var(--term-border)] bg-black/20 px-1.5 py-1">
      <p className="mb-1 text-[7px] font-bold uppercase text-[var(--term-muted)]">{label} kalkulyator</p>
      <div className="flex flex-wrap gap-1 text-[8px]">
        <label className="flex items-center gap-0.5">
          $
          <input
            type="number"
            min={100}
            step={100}
            value={account}
            onChange={(e) => setAccount(Number(e.target.value) || 1000)}
            className="w-14 rounded bg-zinc-900 px-1 py-0 font-mono-ui text-[8px]"
          />
        </label>
        <label className="flex items-center gap-0.5">
          risk%
          <input
            type="number"
            min={0.25}
            max={5}
            step={0.25}
            value={riskPct}
            onChange={(e) => setRiskPct(Number(e.target.value) || 1)}
            className="w-10 rounded bg-zinc-900 px-1 py-0 font-mono-ui text-[8px]"
          />
        </label>
      </div>
      <p className="mt-0.5 font-mono-ui text-[8px] text-cyan-300">
        ~{result.suggestedLots} lot · SL ${result.slDistanceUsd} · risk ${result.riskUsd}
      </p>
      <p className="text-[7px] leading-snug text-[var(--term-muted)]">{result.hintUz}</p>
    </div>
  );
}
