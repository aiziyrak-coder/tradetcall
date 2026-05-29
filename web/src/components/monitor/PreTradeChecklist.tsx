import { useMemo, useState } from "react";
import type { MonitorSnapshot } from "../../../../shared/types";
import { buildTradePlan } from "../../../../shared/trade-plan";
import { resolvePlatformInsight } from "../../lib/platform-client";
import { loadTradePrefs } from "../../lib/trade-prefs";

interface Props {
  data: MonitorSnapshot;
  horizon: "short" | "long";
  onClose: () => void;
}

const STEPS_UZ = [
  "Bozor sifati A/B darajada",
  "Kapital himoyasi yashil",
  "Signal BUY yoki SELL tasdiqlangan",
  "SL va TP aniq — qo'lda kengaytirmayman",
  "Lot hisoblangan — risk % dan oshirmayman",
  "Makro oyna yo'q",
  "30 daqiqa / swing qoidasiga roziman",
];

export function PreTradeChecklist({ data, horizon, onClose }: Props) {
  const platform = resolvePlatformInsight(data);
  const prefs = loadTradePrefs();
  const [checked, setChecked] = useState<boolean[]>(() => STEPS_UZ.map(() => false));

  const strategy = horizon === "short" ? data.shortStrategy : data.strategy;
  const verdict = strategy?.verdict;
  const signal = strategy?.signal;

  const plan = useMemo(() => {
    if (!verdict || !signal) return null;
    return buildTradePlan({
      horizon,
      horizonLabelUz: horizon === "short" ? "YAQIN" : "UZOQ",
      verdict,
      signal,
      accountUsd: prefs.accountUsd,
      riskPercent: prefs.riskPercent,
      maxHoldMinutes: horizon === "short" ? 30 : undefined,
      tradingAllowed: platform?.capitalShield.allowed ?? true,
      disciplineScore: platform?.discipline.score ?? 100,
    });
  }, [verdict, signal, horizon, prefs, platform]);

  const allChecked = checked.every(Boolean);
  const mqOk = (platform?.marketQuality.score ?? 0) >= 55;
  const shieldOk = platform?.capitalShield.allowed ?? false;
  const signalOk = verdict?.action === "BUY" || verdict?.action === "SELL";

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const autoFill = () => {
    setChecked([
      mqOk,
      shieldOk,
      signalOk,
      !!plan?.exitRuleUz,
      (plan?.suggestedLots ?? 0) > 0,
      !data.calendar?.inHighImpactWindow,
      true,
    ]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="fx-glass max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-500/40 p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-amber-400">
              Professional tekshiruv
            </h2>
            <p className="text-[11px] text-slate-400">
              {horizon === "short" ? "YAQIN" : "UZOQ"} — {verdict?.action ?? "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded px-2 py-1 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {plan && (
          <div className="mt-3 rounded-lg border border-[var(--term-border)] bg-black/30 p-3 text-[11px]">
            <p className="font-bold text-cyan-300">{plan.summaryUz}</p>
            <p className="mt-2 text-slate-400">Lot: {plan.suggestedLots || "—"}</p>
            <p className="text-slate-400">SL masofa: ${plan.slDistanceUsd}</p>
            <p className="text-slate-400">{plan.holdExplainUz}</p>
          </div>
        )}

        <button
          type="button"
          onClick={autoFill}
          className="touch-target mt-3 w-full rounded border border-cyan-600/50 py-2 text-[10px] text-cyan-400"
        >
          Avtomatik tekshirish (tizim ma&apos;lumotlari)
        </button>

        <ul className="mt-3 space-y-2">
          {STEPS_UZ.map((label, i) => (
            <li key={label}>
              <label className="flex cursor-pointer items-start gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => toggle(i)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
                />
                <span className={checked[i] ? "text-slate-200" : "text-slate-500"}>
                  {i + 1}. {label}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div
          className={`mt-4 rounded-lg p-3 text-[11px] ${
            allChecked ? "bg-emerald-950/50 text-emerald-300" : "bg-red-950/40 text-red-300"
          }`}
        >
          {allChecked
            ? "Barcha qadamlar tasdiqlandi. Endi brokerda lot oching — platforma avtomatik savdo qilmaydi."
            : "Hali barcha shartlar bajarilmagan. Professional trader majburiy savdo qilmaydi."}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="touch-target mt-3 w-full rounded-lg bg-slate-700 py-3 text-[12px] font-bold text-white"
        >
          Yopish
        </button>
      </div>
    </div>
  );
}
