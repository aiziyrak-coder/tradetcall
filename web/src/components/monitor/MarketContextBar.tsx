import type {
  CalendarStatus,
  NewsMarketAnalysis,
  PriceData,
  ShortTermStrategy,
  LongTermStrategy,
} from "../../../../shared/types";
import { getMarketSession } from "../../../../shared/market-session";

interface Props {
  gold: PriceData | null;
  shortStrategy: ShortTermStrategy | null;
  longStrategy: LongTermStrategy | null;
  newsAnalysis?: NewsMarketAnalysis | null;
  calendar?: CalendarStatus | null;
}

export function MarketContextBar({
  gold,
  shortStrategy,
  longStrategy,
  newsAnalysis,
  calendar,
}: Props) {
  const session = getMarketSession();
  const price = gold?.price ?? 0;
  const atr = shortStrategy?.signal.atr ?? longStrategy?.signal.atr ?? 0;
  const adx = longStrategy?.technical.adx ?? shortStrategy?.technical.adx;

  return (
    <div className="monitor-context-bar flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-[var(--term-border)] bg-[var(--term-panel-2)] px-2 py-1 text-[9px]">
      {gold?.feed === "tradingview" && gold.bid != null && gold.ask != null && (
        <span className="font-mono-ui text-[8px]">
          BID <span className="text-emerald-400">${gold.bid.toFixed(3)}</span> ASK{" "}
          <span className="text-red-400">${gold.ask.toFixed(3)}</span>
        </span>
      )}
      {gold?.source && (
        <span className="font-bold text-cyan-400/90">
          {gold.feed === "tradingview"
            ? "TradingView XAUUSD"
            : gold.feed === "spot"
              ? "Spot API"
              : gold.source.slice(0, 36)}
        </span>
      )}
      <span>
        <span className="text-[var(--term-muted)]">Sessiya: </span>
        <span
          className={
            session.primeWindow
              ? "font-bold text-emerald-400"
              : session.active
                ? "text-amber-300"
                : "text-zinc-500"
          }
        >
          {session.nameUz}
        </span>
        <span className="ml-1 text-[var(--term-muted)]">{session.localHourUz}</span>
      </span>
      {calendar?.eventNameUz && (
        <span className={calendar.inHighImpactWindow ? "font-bold text-red-400" : "text-amber-400"}>
          📅 {calendar.eventNameUz}
          {calendar.minutesUntil != null && calendar.minutesUntil > 0
            ? ` +${calendar.minutesUntil}daq`
            : ""}
        </span>
      )}
      {gold?.high24h != null && gold?.low24h != null && (
        <span>
          <span className="text-[var(--term-muted)]">24s </span>
          <span className="text-emerald-400">${gold.high24h.toFixed(2)}</span>
          <span className="text-[var(--term-muted)]">/</span>
          <span className="text-red-400">${gold.low24h.toFixed(2)}</span>
        </span>
      )}
      {atr > 0 && (
        <span>
          ATR <span className="font-mono-ui font-semibold text-[var(--term-gold)]">${atr}</span>
        </span>
      )}
      {adx != null && adx > 0 && (
        <span>
          ADX <span className="font-mono-ui font-semibold">{adx}</span>
        </span>
      )}
      {shortStrategy && (
        <span>
          TF{" "}
          <span className="font-bold text-cyan-400">
            {shortStrategy.tfAligned}/{shortStrategy.tfTotal}
          </span>
        </span>
      )}
      {price > 0 && shortStrategy?.signal && (
        <span>
          Zona{" "}
          <span className="font-mono-ui">${shortStrategy.signal.distanceToEntry.toFixed(2)}</span>
        </span>
      )}
      <span className={newsAnalysis ? "text-emerald-500/80" : "text-amber-500/90"}>
        {newsAnalysis ? "✓ Yangiliklar tahlili" : "⏳ Yangiliklar kutilmoqda"}
      </span>
      <span className="ml-auto text-[8px] text-[var(--term-muted)]">
        {gold?.feed === "tradingview"
          ? "Narx = TradingView chart"
          : "TradingView ulanmoqda…"}
      </span>
    </div>
  );
}
