import type { AiPhase, AiTradeSignal } from "../../../../shared/ai-trade-signal";
import type { MonitorSessionInfo } from "../../../../shared/types";
import { PriceLadder } from "./PriceLadder";
import { TermCard } from "./TermCard";

const actionStyle: Record<string, string> = {
  BUY: "bg-emerald-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.45)]",
  SELL: "bg-red-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.45)]",
  HOLD: "bg-amber-800/90 text-amber-50 border border-amber-600/40",
};

interface Props {
  phase?: AiPhase;
  signal?: AiTradeSignal | null;
  session?: MonitorSessionInfo | null;
  currentPrice?: number;
  onOpenSettings?: () => void;
}

function LevelRow({
  label,
  price,
  color,
  bold,
}: {
  label: string;
  price: number;
  color: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-[9px]">
      <span className={`${color} ${bold ? "font-black" : "font-semibold"}`}>{label}</span>
      <span className={`font-mono-ui ${bold ? "text-sm font-bold text-[var(--term-cyan)]" : ""}`}>
        ${price.toFixed(2)}
      </span>
    </div>
  );
}

export function AiSignalPanel({
  phase = "idle",
  signal,
  session,
  currentPrice = 0,
  onOpenSettings,
}: Props) {
  const message = session?.messageUz ?? "YANGI PROGNOZ tugmasini bosing — bozor bashorati";

  if (phase === "analyzing") {
    return (
      <TermCard title="Bozor bashorati" accent="violet">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          <p className="text-[10px] font-semibold text-violet-200">{message}</p>
          <p className="max-w-[220px] text-[8px] leading-relaxed text-[var(--term-muted)]">
            Qo&apos;llab-quvvatlash, qarshilik, ATR, momentum — aniq diapazon va kirish nuqtalari
          </p>
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
              className="w-full rounded-md bg-amber-600 px-2 py-2 text-[10px] font-bold text-black"
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
      <TermCard
        title="Bozor bashorati"
        subtitle="Dinamik TP/SL — qarshilik va ATR asosida"
        accent="gold"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-5 text-center">
          <span className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-1.5 text-[11px] font-black tracking-wide text-zinc-400">
            KUTILMOQDA
          </span>
          <p className="text-[9px] text-[var(--term-muted)]">{message}</p>
          <p className="text-[8px] text-slate-500">
            Narx jonli. Bashorat — YANGI PROGNOZ bosilganda (HOLD ham to&apos;liq asoslangan).
          </p>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-2 rounded-md border border-amber-600/50 bg-amber-950/40 px-3 py-1.5 text-[9px] font-bold text-amber-200"
            >
              API kalit → Sozlamalar
            </button>
          )}
        </div>
      </TermCard>
    );
  }

  const action = signal.action;
  const isHold = action === "HOLD";
  const tpUsd = signal.targetMoveUsd ?? Math.abs(signal.takeProfit - signal.entry);
  const tpPips = !isHold ? Math.round((tpUsd / 0.1) * 10) / 10 : 0;
  const slPips =
    !isHold
      ? Math.round((Math.abs(signal.entry - signal.stopLoss) / 0.1) * 10) / 10
      : 0;
  const hasBand =
    signal.forecastHigh != null &&
    signal.forecastLow != null &&
    signal.forecastHigh > signal.forecastLow;

  return (
    <TermCard
      title="Bozor bashorati"
      subtitle={
        isHold
          ? `HOLD · ishonch ${signal.confidence}%${signal.forecastBiasUz ? ` · ${signal.forecastBiasUz}` : ""}`
          : `Maqsad ~$${tpUsd.toFixed(2)} (${tpPips} pip) · SL ~${slPips} pip · R:R ${signal.riskReward}`
      }
      accent="gold"
      headerExtra={
        <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-black ${actionStyle[action]}`}>
          {action}
        </span>
      }
    >
      <div className="term-scroll space-y-2 p-2">
        <p
          className={`rounded-md px-2 py-1 text-[9px] font-medium leading-snug ${
            isHold
              ? "bg-amber-950/50 text-amber-100 border border-amber-800/50"
              : "bg-black/30 text-emerald-400/95"
          }`}
        >
          {signal.summaryUz}
        </p>

        {hasBand && (
          <div className="rounded-md border border-cyan-900/50 bg-cyan-950/20 p-2 space-y-1">
            <p className="text-[8px] font-bold uppercase text-[var(--term-cyan)]">
              Bashorat diapazoni
            </p>
            <LevelRow label="Yuqori (qarshilik)" price={signal.forecastHigh!} color="text-emerald-400" />
            {currentPrice > 0 && (
              <LevelRow label="Hozir" price={currentPrice} color="text-[var(--term-cyan)]" bold />
            )}
            <LevelRow label="Past (qo'llab)" price={signal.forecastLow!} color="text-red-300" />
            {signal.forecastBiasUz && (
              <p className="text-[8px] text-slate-400 pt-1">Moyil: {signal.forecastBiasUz}</p>
            )}
          </div>
        )}

        <div className="rounded-md border border-[var(--term-border)] bg-black/30 p-2">
          <p className="mb-1 text-[8px] font-bold uppercase text-[var(--term-cyan)]">
            {isHold ? "Keyingi harakat (sssenariy)" : "Qachon kirish"}
          </p>
          <p className="text-[9px] leading-snug text-slate-200">{signal.triggerUz}</p>
        </div>

        {currentPrice > 0 && !isHold && (
          <PriceLadder
            current={currentPrice}
            entry={signal.entry}
            stopLoss={signal.stopLoss}
            takeProfit={signal.takeProfit}
            action={action}
          />
        )}

        <div className="rounded-md border border-[var(--term-border)] bg-black/25 p-2 space-y-1">
          <p className="mb-1 text-[8px] font-bold uppercase text-[var(--term-muted)]">
            {isHold ? "Muhim darajalar" : "Savdo raqamlari"}
          </p>
          {!isHold && (
            <>
              <LevelRow label="Take profit" price={signal.takeProfit} color="text-emerald-400" />
              <LevelRow label="Kirish" price={signal.entry} color="text-[var(--term-gold)]" />
            </>
          )}
          {currentPrice > 0 && (
            <LevelRow label="Hozir" price={currentPrice} color="text-[var(--term-cyan)]" bold />
          )}
          {!isHold && (
            <LevelRow label="Stop loss" price={signal.stopLoss} color="text-red-400" />
          )}
          {isHold && hasBand && (
            <>
              <LevelRow
                label="Breakout yuqori"
                price={signal.forecastHigh!}
                color="text-emerald-400"
              />
              <LevelRow label="Breakout past" price={signal.forecastLow!} color="text-red-400" />
            </>
          )}
        </div>

        <div className="rounded-md border border-amber-900/40 bg-amber-950/25 p-2">
          <p className="text-[8px] font-bold text-amber-400">
            {isHold ? "Qoidalar" : "Bekor qilish"}
          </p>
          <p className="text-[9px] text-amber-100/90">{signal.invalidationUz}</p>
        </div>

        <div>
          <p className="mb-0.5 text-[8px] font-bold uppercase text-[var(--term-muted)]">
            To&apos;liq tahlil
          </p>
          <p className="text-[9px] leading-relaxed text-slate-300 whitespace-pre-wrap">
            {signal.analysisUz}
          </p>
        </div>

        <p className="text-[7px] text-[var(--term-muted)]">
          {new Date(signal.createdAt).toLocaleString("uz-UZ")} · dinamik bashorat (qarshilik/ATR)
        </p>
      </div>
    </TermCard>
  );
}
