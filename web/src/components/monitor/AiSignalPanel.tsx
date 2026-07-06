import type { AiPhase, AiTradeSignal } from "../../../../shared/ai-trade-signal";
import type { MonitorSessionInfo } from "../../../../shared/types";
import { PriceLadder } from "./PriceLadder";
import { SignalCore } from "./SignalCore";
import { TermCard } from "./TermCard";

const actionStyle: Record<string, string> = {
  BUY: "empire-action-buy",
  SELL: "empire-action-sell",
  HOLD: "empire-action-hold",
};

interface Props {
  phase?: AiPhase;
  signal?: AiTradeSignal | null;
  session?: MonitorSessionInfo | null;
  currentPrice?: number;
  onOpenSettings?: () => void;
}

export function AiSignalPanel({
  phase = "idle",
  signal,
  session,
  currentPrice = 0,
  onOpenSettings,
}: Props) {
  const message = session?.messageUz ?? "YANGI PROGNOZ — professional panel tahlili";

  if (phase === "analyzing") {
    return (
      <TermCard title="Signal komandasi" accent="violet" empire>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="empire-analyze-ring h-14 w-14 rounded-full" />
          <p className="text-[10px] font-semibold text-violet-200">{message}</p>
          <p className="text-[8px] text-[var(--term-muted)]">8 treyder · TF · yangilik · makro</p>
        </div>
      </TermCard>
    );
  }

  if (phase === "error") {
    const needsKey = /API kalit|kalit yo'q/i.test(message);
    return (
      <TermCard title="Xato" accent="neutral">
        <div className="space-y-2 p-3 text-[9px] leading-relaxed text-red-300">
          <p>{message}</p>
          {needsKey && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="btn-ai-forecast w-full rounded-md px-2 py-2 text-[10px] font-bold"
            >
              Sozlamalar → API kalit
            </button>
          )}
        </div>
      </TermCard>
    );
  }

  if (phase !== "ready" || !signal) {
    return (
      <TermCard title="Signal komandasi" subtitle="PRO panel · manifest AI" accent="gold" empire>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
          <div className="empire-idle-pulse rounded-lg border border-amber-500/30 px-4 py-2 text-[10px] font-black tracking-widest text-amber-400/80">
            STANDBY
          </div>
          <p className="text-[9px] text-[var(--term-muted)]">{message}</p>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-md border border-cyan-600/50 bg-cyan-950/40 px-3 py-1.5 text-[9px] font-bold text-cyan-200"
            >
              API kalit
            </button>
          )}
        </div>
      </TermCard>
    );
  }

  const action = signal.action;
  const isHold = action === "HOLD";
  const winProb = signal.winProbability;
  const grade = signal.signalGrade;

  return (
    <TermCard
      title="Signal komandasi"
      subtitle={signal.summaryUz.slice(0, 72)}
      accent="gold"
      empire
      headerExtra={
        <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-black ${actionStyle[action]}`}>
          {action}
        </span>
      }
    >
      <div className="term-scroll space-y-2 p-2">
        <SignalCore
          action={action}
          winProbability={winProb}
          grade={grade}
          confluencePct={signal.confluencePct}
          confidence={signal.confidence}
        />

        {!isHold && currentPrice > 0 && (
          <PriceLadder
            current={currentPrice}
            entry={signal.entry}
            stopLoss={signal.stopLoss}
            takeProfit={signal.takeProfit}
            action={action}
          />
        )}

        <div className="rounded-md border border-[var(--term-border)] bg-black/30 p-2">
          <p className="mb-1 text-[8px] font-bold uppercase text-[var(--term-cyan)]">
            {isHold ? "Kutilayotgan ssenariy" : "Kirish sharti"}
          </p>
          <p className="text-[9px] leading-snug text-slate-200">{signal.triggerUz}</p>
        </div>

        {!isHold && (
          <div className="grid grid-cols-3 gap-1 text-center font-mono-ui text-[8px]">
            <div className="rounded border border-red-500/30 bg-red-950/20 p-1">
              <p className="text-red-400">SL</p>
              <p className="font-bold">${signal.stopLoss.toFixed(2)}</p>
            </div>
            <div className="rounded border border-amber-500/30 bg-amber-950/20 p-1">
              <p className="text-amber-400">Kirish</p>
              <p className="font-bold">${signal.entry.toFixed(2)}</p>
            </div>
            <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-1">
              <p className="text-emerald-400">TP</p>
              <p className="font-bold">${signal.takeProfit.toFixed(2)}</p>
            </div>
          </div>
        )}

        <div className="rounded-md border border-amber-900/40 bg-amber-950/25 p-2">
          <p className="text-[8px] font-bold text-amber-400">Bekor qilish</p>
          <p className="text-[9px] text-amber-100/90">{signal.invalidationUz}</p>
        </div>

        {signal.panelUz && (
          <p className="text-[8px] leading-relaxed text-violet-200/80">{signal.panelUz}</p>
        )}

        <details className="group">
          <summary className="cursor-pointer text-[8px] font-bold uppercase text-[var(--term-muted)]">
            To&apos;liq tahlil
          </summary>
          <p className="mt-1 text-[9px] leading-relaxed text-slate-300 whitespace-pre-wrap">
            {signal.analysisUz}
          </p>
        </details>
      </div>
    </TermCard>
  );
}
