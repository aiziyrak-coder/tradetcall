import { useState } from "react";
import type { MonitorSnapshot } from "../../../../shared/types";
import { resolvePlatformInsight } from "../../lib/platform-client";
import { PreTradeChecklist } from "./PreTradeChecklist";
import { PanelShell } from "./PanelShell";

interface Props {
  data: MonitorSnapshot | null;
}

function scoreColor(score: number): string {
  if (score >= 82) return "text-emerald-400";
  if (score >= 68) return "text-cyan-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function shieldColor(level: string): string {
  if (level === "green") return "border-emerald-500/50 bg-emerald-950/30";
  if (level === "yellow") return "border-amber-500/50 bg-amber-950/30";
  return "border-red-500/50 bg-red-950/30";
}

export function PlatformCommandCenter({ data }: Props) {
  const platform = resolvePlatformInsight(data);
  const [preTradeOpen, setPreTradeOpen] = useState(false);
  const [explainerTab, setExplainerTab] = useState<"short" | "long">("short");

  if (!platform) {
    return (
      <PanelShell title="⚡ PLATFORM PRO" compact>
        <p className="text-[10px] text-slate-500">Platform intellekt yuklanmoqda…</p>
      </PanelShell>
    );
  }

  const mq = platform.marketQuality;
  const shield = platform.capitalShield;
  const explainer =
    explainerTab === "short" ? platform.shortExplainer : platform.longExplainer;
  const activeVerdict =
    explainerTab === "short" ? data?.shortStrategy?.verdict : data?.strategy?.verdict;

  return (
    <>
      <PanelShell title="⚡ PLATFORM PRO" compact accent="cyan">
        <div className="flex flex-col gap-2">
        <p className="text-[9px] leading-snug text-slate-400">{platform.playbookUz}</p>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded border border-[var(--term-border)] bg-[var(--term-panel-2)] p-2">
            <p className="text-[8px] uppercase tracking-wide text-slate-500">Bozor sifati</p>
            <p className={`font-mono-ui text-lg font-bold ${scoreColor(mq.score)}`}>
              {mq.score}
              <span className="text-[10px] text-slate-500">/100</span>
            </p>
            <p className="text-[9px] text-slate-400">{mq.gradeUz}</p>
            <p className="mt-1 text-[8px] text-slate-500">{mq.feedUz}</p>
          </div>

          <div className={`rounded border p-2 ${shieldColor(shield.level)}`}>
            <p className="text-[8px] uppercase tracking-wide text-slate-500">Kapital himoya</p>
            <p className="text-[11px] font-bold text-slate-200">{shield.levelUz}</p>
            <p className="mt-1 text-[8px] leading-snug text-slate-400">
              {shield.messagesUz[0]}
            </p>
          </div>
        </div>

        <div className="rounded border border-[var(--term-border)] bg-black/20 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[8px] font-bold uppercase text-cyan-500/90">Signal jurnali</p>
            <span className="font-mono-ui text-[10px] text-emerald-400">
              {platform.journalStats.winRatePct}% WR
            </span>
          </div>
          <div className="mt-1 flex gap-3 font-mono-ui text-[9px] text-slate-400">
            <span>Jami {platform.journalStats.total}</span>
            <span className="text-emerald-400">+{platform.journalStats.wins}</span>
            <span className="text-red-400">−{platform.journalStats.losses}</span>
            <span>Kutmoqda {platform.journalStats.pending}</span>
            <span>7kun {platform.journalStats.last7WinRatePct}%</span>
          </div>
        </div>

        <div className="rounded border border-[var(--term-border)] bg-black/20 p-2">
          <p className="text-[8px] font-bold uppercase text-violet-400/90">Tez backtest (5m)</p>
          <div className="mt-1 flex gap-3 text-[9px]">
            <span>
              YAQIN: {platform.backtestShort.winRatePct}% ({platform.backtestShort.samples})
            </span>
            <span>
              UZOQ: {platform.backtestLong.winRatePct}% ({platform.backtestLong.samples})
            </span>
          </div>
          <p className="mt-1 text-[8px] text-slate-500">{platform.backtestShort.noteUz}</p>
        </div>

        <div className="rounded border border-[var(--term-border)] bg-black/20 p-2">
          <div className="mb-1 flex gap-1">
            {(["short", "long"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setExplainerTab(t)}
                className={`touch-target rounded px-2 py-0.5 text-[9px] font-bold ${
                  explainerTab === t
                    ? "bg-cyan-600/40 text-cyan-200"
                    : "bg-slate-800/60 text-slate-500"
                }`}
              >
                {t === "short" ? "YAQIN" : "UZOQ"}
              </button>
            ))}
          </div>
          {explainer && (
            <>
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold ${
                    explainer.action === "BUY"
                      ? "text-emerald-400"
                      : explainer.action === "SELL"
                        ? "text-red-400"
                        : "text-amber-400"
                  }`}
                >
                  {explainer.action}
                </span>
                <span className="font-mono-ui text-[9px] text-slate-500">
                  Tayyorlik {explainer.readinessPct}%
                </span>
              </div>
              <p className="mt-1 text-[8px] text-slate-500">{explainer.rawBiasUz}</p>
              <ul className="mt-1.5 max-h-24 space-y-0.5 overflow-y-auto">
                {explainer.blockers.map((b) => (
                  <li
                    key={b.id}
                    className={`flex gap-1 text-[8px] ${b.ok ? "text-emerald-500/80" : "text-red-400/90"}`}
                  >
                    <span>{b.ok ? "✓" : "✗"}</span>
                    <span>
                      {b.labelUz}: {b.detailUz.slice(0, 50)}
                    </span>
                  </li>
                ))}
              </ul>
              {explainer.unlockUz.length > 0 && explainer.action === "HOLD" && (
                <p className="mt-1 text-[8px] text-cyan-400/90">
                  Ochish: {explainer.unlockUz[0]}
                </p>
              )}
              <p className="mt-1 text-[8px] italic text-slate-400">{explainer.coachUz}</p>
            </>
          )}
        </div>

        <div className="rounded border border-dashed border-slate-600/40 p-2">
          <p className="text-[8px] font-bold text-slate-500">PLATFORM AUDIT</p>
          <p className="text-[9px] text-slate-400">
            {platform.audit.healthPct}% — {platform.audit.gradeUz} ({platform.audit.passed}/
            {platform.audit.total})
          </p>
        </div>

        {(activeVerdict?.action === "BUY" || activeVerdict?.action === "SELL") && (
          <button
            type="button"
            onClick={() => setPreTradeOpen(true)}
            className="touch-target w-full rounded-lg bg-gradient-to-r from-amber-600/90 to-amber-500/80 py-2.5 text-[11px] font-bold text-black"
          >
            Savdo oldidan tekshiruv — 7 qadam
          </button>
        )}
        </div>
      </PanelShell>

      {preTradeOpen && data && (
        <PreTradeChecklist
          data={data}
          horizon={explainerTab}
          onClose={() => setPreTradeOpen(false)}
        />
      )}
    </>
  );
}
