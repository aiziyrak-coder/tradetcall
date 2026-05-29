import { useMemo, useState } from "react";
import type { HorizonVerdict } from "../../../../shared/types";
import type { SignalDetail } from "../../../../shared/signal-detail";
import { buildTradePlan } from "../../../../shared/trade-plan";
import { loadTradePrefs, saveTradePrefs } from "../../lib/trade-prefs";

interface Props {
  horizon: "long" | "short";
  horizonLabelUz: string;
  verdict: HorizonVerdict;
  signal: SignalDetail;
  maxHoldMinutes?: number;
  tradingAllowed?: boolean;
  disciplineScore?: number;
}

export function TradePlanPanel({
  horizon,
  horizonLabelUz,
  verdict,
  signal,
  maxHoldMinutes,
  tradingAllowed = true,
  disciplineScore = 100,
}: Props) {
  const [prefs, setPrefs] = useState(loadTradePrefs);

  const plan = useMemo(
    () =>
      buildTradePlan({
        horizon,
        horizonLabelUz,
        verdict,
        signal,
        accountUsd: prefs.accountUsd,
        riskPercent: prefs.riskPercent,
        maxHoldMinutes,
        tradingAllowed,
        disciplineScore,
      }),
    [horizon, horizonLabelUz, verdict, signal, prefs, maxHoldMinutes, tradingAllowed, disciplineScore]
  );

  const updatePref = (patch: Partial<typeof prefs>) => {
    setPrefs(saveTradePrefs(patch));
  };

  return (
    <div
      className={`rounded-lg border p-2 sm:p-2.5 ${
        plan.trusted
          ? "border-emerald-500/50 bg-emerald-950/30"
          : "border-amber-500/40 bg-amber-950/20"
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--term-gold)] sm:text-[10px]">
        Savdo rejasi — lot va vaqt
      </p>

      <div className="mt-2 flex flex-wrap gap-2 text-[10px] sm:text-[11px]">
        <label className="flex min-h-[36px] flex-1 items-center gap-1 rounded border border-[var(--term-border)] bg-black/30 px-2 py-1">
          <span className="text-[var(--term-muted)]">Depozit $</span>
          <input
            type="number"
            inputMode="decimal"
            min={100}
            step={100}
            value={prefs.accountUsd}
            onChange={(e) => updatePref({ accountUsd: Number(e.target.value) || 1000 })}
            className="min-w-0 flex-1 bg-transparent font-mono-ui text-sm font-bold text-cyan-300 outline-none"
          />
        </label>
        <label className="flex min-h-[36px] w-24 items-center gap-1 rounded border border-[var(--term-border)] bg-black/30 px-2 py-1">
          <span className="text-[var(--term-muted)]">Risk %</span>
          <input
            type="number"
            inputMode="decimal"
            min={0.25}
            max={5}
            step={0.25}
            value={prefs.riskPercent}
            onChange={(e) => updatePref({ riskPercent: Number(e.target.value) || 1 })}
            className="w-full bg-transparent font-mono-ui text-sm font-bold text-amber-300 outline-none"
          />
        </label>
      </div>

      {plan.trusted ? (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-md bg-black/40 p-2 text-center">
            <p className="text-[8px] uppercase text-[var(--term-muted)]">Lot</p>
            <p className="font-mono-ui text-xl font-black text-emerald-400 sm:text-2xl">
              {plan.suggestedLots}
            </p>
          </div>
          <div className="rounded-md bg-black/40 p-2 text-center">
            <p className="text-[8px] uppercase text-[var(--term-muted)]">Bozorda</p>
            <p className="font-display text-sm font-bold leading-tight text-cyan-300 sm:text-base">
              {horizon === "short" ? "30 daqiqa" : "1–4 hafta"}
            </p>
          </div>
          <div className="col-span-2 rounded-md bg-black/40 p-2 sm:col-span-1">
            <p className="text-[8px] uppercase text-[var(--term-muted)]">Filter</p>
            <p className="font-mono-ui text-sm font-bold text-emerald-400">
              {plan.filterPassed}/{plan.filterTotal} MOS
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2 rounded-md bg-black/30 p-2 text-[10px] font-medium text-amber-200 sm:text-[11px]">
          Lot: <b>0</b> — {plan.lotsExplainUz}
        </p>
      )}

      <ul className="mt-2 space-y-1.5 text-[10px] leading-snug text-[var(--term-text)] sm:text-[11px]">
        {plan.stepsUz.map((s, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="shrink-0 text-[var(--term-gold)]">•</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[9px] leading-relaxed text-[var(--term-muted)]">{plan.lotsExplainUz}</p>
      <p className="mt-1 text-[9px] leading-relaxed text-[var(--term-muted)]">{plan.holdExplainUz}</p>
    </div>
  );
}
