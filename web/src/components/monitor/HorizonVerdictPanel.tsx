import type { ReactNode } from "react";
import type { HorizonVerdict } from "../../../../shared/types";
import { SignalChecklist } from "./SignalChecklist";
import { RiskCalculatorCompact } from "./RiskCalculatorCompact";
import type { SignalDetail } from "../../../../shared/signal-detail";

const actionStyle: Record<string, string> = {
  BUY: "bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]",
  SELL: "bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.35)]",
  HOLD: "bg-amber-700 text-amber-50",
};

interface Props {
  verdict: HorizonVerdict;
  signal: SignalDetail;
  accent: "amber" | "cyan";
  children?: ReactNode;
}

export function HorizonVerdictPanel({ verdict, signal, accent, children }: Props) {
  const border = accent === "amber" ? "border-amber-500/40" : "border-cyan-500/40";
  const labelColor = accent === "amber" ? "text-amber-400" : "text-cyan-400";
  const trusted = verdict.action !== "HOLD" && verdict.gateAllowed;

  return (
    <div className="space-y-1.5">
      <div className={`flex items-center gap-2 rounded-md border ${border} bg-black/30 px-2 py-1.5`}>
        <span
          className={`min-w-[52px] rounded px-2 py-1 text-center font-display text-sm font-black ${actionStyle[verdict.action]}`}
        >
          {verdict.action}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[8px] text-[var(--term-muted)]">{verdict.horizonLabelUz}</p>
          <p className={`font-mono-ui text-[10px] font-bold ${trusted ? "text-emerald-400" : "text-amber-400"}`}>
            {verdict.reliabilityUz}
          </p>
          <p className="text-[7px] text-[var(--term-muted)]">
            Kuch {verdict.strength}% · Yangiliklar {verdict.newsWeightPct}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-0.5">
        {verdict.pillars.map((p) => (
          <div
            key={p.label}
            className="rounded bg-zinc-900/80 px-1 py-0.5 text-center"
            title={p.noteUz}
          >
            <p className="text-[6px] uppercase text-[var(--term-muted)]">{p.label}</p>
            <p
              className={`font-mono-ui text-[9px] font-bold ${
                p.score >= 70 ? "text-emerald-400" : p.score >= 45 ? "text-amber-300" : "text-zinc-500"
              }`}
            >
              {Math.round(p.score)}
            </p>
          </div>
        ))}
      </div>

      <section className={`rounded border ${border} bg-[var(--term-bg)] p-1.5`}>
        <p className={`mb-0.5 text-[7px] font-bold uppercase ${labelColor}`}>① Tahlil (yangiliklar asosiy)</p>
        <p className="text-[8px] leading-snug text-[var(--term-text)]">{verdict.analysisUz}</p>
      </section>

      <section className={`rounded border ${border}/60 bg-[var(--term-bg)] p-1.5`}>
        <p className={`mb-0.5 text-[7px] font-bold uppercase ${labelColor}`}>② Bashorat</p>
        <p className="text-[8px] leading-snug text-[var(--term-text-2)]">{verdict.forecastUz}</p>
      </section>

      <section
        className={`rounded border ${border} p-1.5 ${trusted ? "bg-emerald-950/25" : "bg-amber-950/25"}`}
      >
        <p className={`mb-0.5 text-[7px] font-bold uppercase ${labelColor}`}>③ Signal</p>
        <p className="font-mono-ui text-[9px] font-bold leading-snug text-[var(--term-text)]">
          {verdict.signalUz}
        </p>
        <div className="mt-1 grid grid-cols-3 gap-1 font-mono-ui text-[8px]">
          <span>
            K <b className="text-amber-300">${verdict.entry}</b>
          </span>
          <span>
            SL <b className="text-red-400">${verdict.stopLoss}</b>
          </span>
          <span>
            TP <b className="text-emerald-400">${verdict.takeProfit}</b>
          </span>
        </div>
      </section>

      <SignalChecklist items={verdict.checklist} />
      {trusted && <RiskCalculatorCompact signal={signal} />}
      {children}
    </div>
  );
}
