import type { AiTradeSignal } from "../../../../shared/ai-trade-signal";
import type { PriceData } from "../../../../shared/types";

interface Props {
  gold: PriceData | null;
  tickFlash: number;
  liveOk: boolean;
  priceStale?: boolean;
  lastUpdate: string;
  aiSignal?: AiTradeSignal | null;
}

export function LivePriceHero({
  gold,
  tickFlash,
  liveOk,
  priceStale,
  lastUpdate,
  aiSignal,
}: Props) {
  const up = (gold?.change ?? 0) >= 0;
  const tickDelta = gold?.tickDelta ?? 0;
  const changeLabel =
    gold &&
    (Math.abs(tickDelta) >= 0.01
      ? `${tickDelta >= 0 ? "+" : ""}$${Math.abs(tickDelta).toFixed(2)}`
      : Math.abs(gold.changePercent) >= 0.01
        ? `${up ? "+" : ""}${gold.changePercent.toFixed(2)}%`
        : Math.abs(gold.change) >= 0.01
          ? `${up ? "+" : ""}$${Math.abs(gold.change).toFixed(2)}`
          : `${up ? "+" : ""}${gold.change.toFixed(2)}`);

  const action = aiSignal?.action;
  const heroGlow =
    action === "BUY"
      ? "live-hero--buy"
      : action === "SELL"
        ? "live-hero--sell"
        : "live-hero--neutral";

  return (
    <div
      className={`live-price-hero empire-card-glow term-card flex h-full min-h-0 flex-col items-center justify-center border-[var(--term-gold)]/25 bg-gradient-to-b from-[var(--term-panel)] to-[var(--term-panel-2)] px-3 py-3 ${heroGlow}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase ${
            liveOk && !priceStale
              ? "bg-emerald-500/20 text-emerald-400 empire-live-pulse"
              : "bg-amber-500/20 text-amber-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              liveOk && !priceStale ? "animate-pulse-dot bg-emerald-400" : "bg-amber-500"
            }`}
          />
          {liveOk && !priceStale ? "JONLI" : priceStale ? "KECHIKDI" : "ULANMOQDA"}
        </span>
        <span className="font-mono-ui text-[8px] text-[var(--term-muted)]">{lastUpdate}</span>
      </div>

      <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[var(--term-muted)]">
        XAUUSD
      </p>

      {gold ? (
        <div
          key={`${gold.price}-${tickFlash}`}
          className={`live-price-tick mt-0.5 text-center font-mono-ui ${up ? "live-price-up" : "live-price-down"}`}
        >
          <span className="live-price-main block text-4xl font-black leading-none sm:text-5xl md:text-[3.5rem]">
            ${gold.price.toFixed(2)}
          </span>
          <span
            className={`mt-1.5 inline-flex items-center gap-1 text-base font-bold sm:text-lg ${
              up ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {up ? "▲" : "▼"} {changeLabel}
          </span>
        </div>
      ) : (
        <p className="mt-4 text-2xl font-bold text-[var(--term-muted)]">—</p>
      )}

      {aiSignal && aiSignal.action !== "HOLD" && (
        <div className="empire-signal-beam mt-2 flex items-center gap-2 rounded-full border px-3 py-1 text-[8px] font-black uppercase">
          <span
            className={
              aiSignal.action === "BUY" ? "text-emerald-400" : "text-red-400"
            }
          >
            {aiSignal.action}
          </span>
          {aiSignal.winProbability != null && (
            <span className="text-[var(--term-gold)]">~{aiSignal.winProbability}%</span>
          )}
          {aiSignal.signalGrade && (
            <span className="text-violet-300">{aiSignal.signalGrade}</span>
          )}
        </div>
      )}

      {gold?.high24h != null && gold?.low24h != null && (
        <div className="mt-2 flex gap-4 font-mono-ui text-[9px] text-[var(--term-muted)]">
          <span>
            H <span className="text-emerald-400">${gold.high24h.toFixed(2)}</span>
          </span>
          <span>
            L <span className="text-red-400">${gold.low24h.toFixed(2)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
