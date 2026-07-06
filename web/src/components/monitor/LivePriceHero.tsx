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
      : `${up ? "+" : ""}${gold.changePercent.toFixed(2)}%`);

  const action = aiSignal?.action;
  const heroClass =
    action === "BUY"
      ? "cine-hero cine-hero--buy"
      : action === "SELL"
        ? "cine-hero cine-hero--sell"
        : "cine-hero";

  return (
    <div className={`${heroClass} h-full flex flex-col items-center justify-center px-4 py-2`}>
      <div className="cine-hero__frame" />
      <div className="mb-2 flex items-center gap-2">
        <span className={`cine-live-badge ${liveOk && !priceStale ? "cine-live-badge--on" : ""}`}>
          {liveOk && !priceStale ? "● JONLI" : "○ OFFLINE"}
        </span>
        <span className="font-mono-ui text-[9px] text-slate-500">{lastUpdate}</span>
      </div>

      <p className="font-cine text-[10px] tracking-[0.4em] text-cyan-400/80">XAUUSD · OLTIN</p>

      {gold ? (
        <div key={`${gold.price}-${tickFlash}`} className="cine-price-tick text-center">
          <span className={`cine-price font-mono-ui ${up ? "cine-price--up" : "cine-price--down"}`}>
            ${gold.price.toFixed(2)}
          </span>
          <span className={`mt-2 block text-lg font-bold ${up ? "text-emerald-400" : "text-red-400"}`}>
            {up ? "▲" : "▼"} {changeLabel}
          </span>
        </div>
      ) : (
        <p className="text-3xl text-slate-600">—</p>
      )}

      {aiSignal?.forecastBiasUz && (
        <p className="mt-3 font-cine text-[11px] tracking-wider text-violet-300">
          {aiSignal.forecastBiasUz}
        </p>
      )}

      {gold?.high24h != null && gold?.low24h != null && (
        <div className="mt-3 flex gap-6 font-mono-ui text-[10px]">
          <span className="text-emerald-400/90">H ${gold.high24h.toFixed(2)}</span>
          <span className="text-red-400/90">L ${gold.low24h.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
