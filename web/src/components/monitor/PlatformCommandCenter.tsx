import { useState } from "react";
import type { MonitorSnapshot } from "../../../../shared/types";
import { resolvePlatformInsight } from "../../lib/platform-client";
import { api } from "../../lib/api";
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
  const [showHelp, setShowHelp] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [weeklyLines, setWeeklyLines] = useState<string[]>([]);

  if (!platform) {
    return (
      <PanelShell title="PLATFORM PRO" compact fillHeight={false}>
        <p className="text-[10px] text-slate-500">Yuklanmoqda…</p>
      </PanelShell>
    );
  }

  const mq = platform.marketQuality;
  const shield = platform.capitalShield;
  const explainer =
    explainerTab === "short" ? platform.shortExplainer : platform.longExplainer;
  const activeVerdict =
    explainerTab === "short" ? data?.shortStrategy?.verdict : data?.strategy?.verdict;

  const openWeekly = () => {
    void api.reports.weekly().then((r) => {
      if (r.report?.linesUz) {
        setWeeklyLines(r.report.linesUz);
        setWeeklyOpen(true);
      }
    });
  };

  return (
    <>
      <PanelShell
        title="PLATFORM PRO"
        subtitle="4–8: makro · himoya · texnik · qoidalar"
        compact
        accent="cyan"
        fillHeight={false}
        badge={
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="rounded border border-cyan-600/40 px-1.5 py-0.5 text-[8px] text-cyan-300"
          >
            ?
          </button>
        }
      >
        {showHelp && (
          <div className="mb-1.5 rounded border border-cyan-700/40 bg-cyan-950/25 p-1.5 text-[7px] leading-snug text-slate-300">
            <b>4 Makro:</b> FF taqvim, DXY/oltin, yangiliklar yangiligi.{" "}
            <b>6 Himoya:</b> kunlik foyda/zarar stop, tanaffus, haftalik hisobot.{" "}
            <b>7 Texnik:</b> Spot narx, ATR dinamik SL/TP.{" "}
            <b>8 Qoidalar:</b> professional discipline ball.
          </div>
        )}

        <p className="line-clamp-2 text-[8px] leading-snug text-slate-400">{platform.playbookUz}</p>

        {!shield.allowed && (
          <div className="mt-1 rounded border border-red-500/50 bg-red-950/40 px-2 py-1 text-[8px] font-bold text-red-200">
            Bugun savdo YO&apos;Q — kapital himoyasi. Ertaga yoki shartlar yashil bo&apos;lganda kiring.
          </div>
        )}
        {shield.allowed && platform.discipline.score < 62 && (
          <div className="mt-1 rounded border border-amber-500/40 bg-amber-950/30 px-2 py-1 text-[8px] text-amber-200">
            Qoidalar {platform.discipline.score}% — faqat kuzatuv, lot ochmang.
          </div>
        )}
        {platform.journalStats.last7WinRatePct > 0 &&
          platform.journalStats.last7WinRatePct < 42 &&
          platform.journalStats.wins + platform.journalStats.losses >= 8 && (
            <div className="mt-1 rounded border border-violet-500/40 bg-violet-950/25 px-2 py-1 text-[8px] text-violet-200">
              Oxirgi 7 kun WR {platform.journalStats.last7WinRatePct}% — scalp signallar qattiqlashtirildi.
            </div>
          )}

        <div className="mt-1 grid grid-cols-2 gap-1">
          <div className="rounded border border-[var(--term-border)] bg-[var(--term-panel-2)] p-1.5">
            <p className="text-[7px] uppercase text-slate-500">Bozor</p>
            <p className={`font-mono-ui text-base font-bold ${scoreColor(mq.score)}`}>
              {mq.score}
            </p>
            <p className="text-[7px] text-slate-500">{mq.feedUz.slice(0, 28)}</p>
          </div>
          <div className={`rounded border p-1.5 ${shieldColor(shield.level)}`}>
            <p className="text-[7px] uppercase text-slate-500">Himoya</p>
            <p className="text-[9px] font-bold">{shield.level === "green" ? "OK" : "STOP"}</p>
            <p className="line-clamp-2 text-[7px]">{shield.messagesUz[0]}</p>
          </div>
        </div>

        <div className="mt-1 space-y-0.5 text-[7px] leading-snug">
          <p className={platform.macroCorrelation.aligned ? "text-slate-400" : "text-amber-400"}>
            Makro: {platform.macroCorrelation.biasUz}
            {platform.macroCorrelation.warningUz ? ` — ${platform.macroCorrelation.warningUz}` : ""}
          </p>
          <p className={platform.newsFreshness.stale ? "text-red-400/90" : "text-slate-500"}>
            {platform.newsFreshness.freshnessUz}
          </p>
          {platform.priceDivergence && (
            <p className={platform.priceDivergence.severe ? "text-red-400" : "text-slate-500"}>
              {platform.priceDivergence.trustUz}
            </p>
          )}
          <p
            className={
              platform.discipline.score >= 70 ? "text-emerald-400/90" : "text-amber-400/90"
            }
          >
            Qoidalar {platform.discipline.score}% ({platform.discipline.passed}/
            {platform.discipline.total})
          </p>
        </div>

        <div className="mt-1 flex flex-wrap gap-x-2 font-mono-ui text-[8px] text-slate-500">
          <span>WR {platform.journalStats.winRatePct}%</span>
          <span>5m {platform.backtestShort.winRatePct}%</span>
          <span>Hafta {platform.weeklyReport.winRatePct}%</span>
          <button
            type="button"
            onClick={openWeekly}
            className="text-cyan-400 underline"
          >
            hisobot
          </button>
        </div>

        <div className="mt-1 rounded border border-[var(--term-border)] bg-black/20 p-1.5">
          <div className="flex items-center gap-1">
            {(["short", "long"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setExplainerTab(t)}
                className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                  explainerTab === t ? "bg-cyan-600/40 text-cyan-200" : "bg-slate-800/60 text-slate-500"
                }`}
              >
                {t === "short" ? "YAQIN" : "UZOQ"}
              </button>
            ))}
            {explainer && (
              <span
                className={`ml-auto text-[10px] font-bold ${
                  explainer.action === "BUY"
                    ? "text-emerald-400"
                    : explainer.action === "SELL"
                      ? "text-red-400"
                      : "text-amber-400"
                }`}
              >
                {explainer.action}
              </span>
            )}
          </div>
          {explainer?.action === "HOLD" && explainer.unlockUz[0] && (
            <p className="mt-0.5 text-[7px] text-cyan-400">→ {explainer.unlockUz[0]}</p>
          )}
        </div>

        {(activeVerdict?.action === "BUY" || activeVerdict?.action === "SELL") && (
          <button
            type="button"
            onClick={() => setPreTradeOpen(true)}
            className="touch-target mt-1 w-full rounded bg-amber-600/90 py-1.5 text-[9px] font-bold text-black"
          >
            7 qadam tekshiruv
          </button>
        )}
      </PanelShell>

      {weeklyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
          <div className="fx-glass max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-xl border border-violet-500/40 p-4">
            <h3 className="font-bold text-violet-300">Haftalik hisobot</h3>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
              {weeklyLines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-slate-500">{platform.weeklyReport.summaryUz}</p>
            <button
              type="button"
              onClick={() => setWeeklyOpen(false)}
              className="touch-target mt-3 w-full rounded bg-slate-700 py-2 text-[11px]"
            >
              Yopish
            </button>
          </div>
        </div>
      )}

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
