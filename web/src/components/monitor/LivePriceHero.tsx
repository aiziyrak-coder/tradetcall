import type { PriceData } from "../../../../shared/types";

interface Props {
  gold: PriceData | null;
  tickFlash: number;
  liveOk: boolean;
  priceStale?: boolean;
  lastUpdate: string;
}

export function LivePriceHero({ gold, tickFlash, liveOk, priceStale, lastUpdate }: Props) {
  const up = (gold?.change ?? 0) >= 0;
  const changeLabel =
    gold &&
    (Math.abs(gold.changePercent) >= 0.01
      ? `${up ? "+" : ""}${gold.changePercent.toFixed(2)}%`
      : `${up ? "+" : ""}${gold.change.toFixed(2)}`);

  const decimals = 2;
  const feedLabel =
    gold?.feed === "tradingview"
      ? gold.source?.includes("FOREXCOM")
        ? "TradingView · FOREX.com XAUUSD"
        : gold.source?.includes("OANDA")
          ? "TradingView · OANDA XAUUSD"
          : "TradingView XAUUSD"
      : gold?.feed === "spot"
        ? "Spot API"
        : gold?.feed === "yahoo"
          ? "Yahoo"
          : gold?.source ?? "—";

  return (
    <div className="live-price-hero flex h-full min-h-0 flex-col items-center justify-center rounded-md border border-[var(--term-border)] bg-gradient-to-b from-[var(--term-panel)] to-[var(--term-panel-2)] px-3 py-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
            liveOk && !priceStale
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-amber-500/20 text-amber-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              liveOk && !priceStale ? "animate-pulse-dot bg-emerald-400" : "bg-amber-500"
            }`}
          />
          {liveOk && !priceStale
            ? gold?.feed === "tradingview"
              ? "TradingView"
              : "Realtime"
            : priceStale
              ? "Kechikdi"
              : "Ulanmoqda"}
        </span>
        <span className="text-[9px] text-[var(--term-muted)]">{lastUpdate}</span>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--term-muted)]">
        XAUUSD · Oltin
      </p>

      {gold ? (
        <div
          key={`${gold.price}-${tickFlash}`}
          className={`live-price-tick mt-1 text-center font-mono-ui ${up ? "live-price-up" : "live-price-down"}`}
        >
          {gold.bid != null && gold.ask != null && (
            <p className="mb-1 font-mono-ui text-[10px] text-[var(--term-muted)]">
              Sotish <span className="text-red-400">${gold.bid.toFixed(2)}</span>
              {" · "}
              Sotib olish <span className="text-emerald-400">${gold.ask.toFixed(2)}</span>
            </p>
          )}
          <span className="block text-4xl font-black leading-none text-[var(--term-gold)] sm:text-5xl md:text-6xl">
            ${gold.price.toFixed(decimals)}
          </span>
          {gold.bid != null && gold.ask != null && (
            <p className="mt-1 text-[9px] text-[var(--term-muted)]">
              O&apos;rta narx (chart sell/buy o&apos;rtasi)
            </p>
          )}
          <span
            className={`mt-2 inline-flex items-center gap-1 text-lg font-bold sm:text-xl ${
              up ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {up ? "▲" : "▼"} {changeLabel}
          </span>
        </div>
      ) : (
        <p className="mt-4 text-2xl font-bold text-[var(--term-muted)]">—</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-[var(--term-muted)]">
        {gold?.high24h != null && gold?.low24h != null && (
          <span>
            24s{" "}
            <span className="text-emerald-400">${gold.high24h.toFixed(2)}</span>
            {" / "}
            <span className="text-red-400">${gold.low24h.toFixed(2)}</span>
          </span>
        )}
        <span title={gold?.source}>{feedLabel}</span>
      </div>
    </div>
  );
}
