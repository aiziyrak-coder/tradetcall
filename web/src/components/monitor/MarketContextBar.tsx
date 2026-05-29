import type {
  CalendarStatus,
  NewsMarketAnalysis,
  PriceData,
  TechnicalAnalysis,
} from "../../../../shared/types";
import { getMarketSession } from "../../../../shared/market-session";

interface Props {
  gold: PriceData | null;
  marketTechnical?: TechnicalAnalysis | null;
  newsAnalysis?: NewsMarketAnalysis | null;
  calendar?: CalendarStatus | null;
}

export function MarketContextBar({
  gold,
  marketTechnical,
  newsAnalysis,
  calendar,
}: Props) {
  const session = getMarketSession();
  const atr = marketTechnical?.atr ?? 0;
  const adx = marketTechnical?.adx;

  return (
    <div className="monitor-context-bar flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-[var(--term-border)] bg-[var(--term-panel-2)] px-2 py-1 text-[9px]">
      {gold?.feed === "tradingview" && gold.bid != null && gold.ask != null && (
        <span className="font-mono-ui text-[8px]">
          Sotish <span className="text-red-400">${gold.bid.toFixed(2)}</span> · Sotib olish{" "}
          <span className="text-emerald-400">${gold.ask.toFixed(2)}</span>
        </span>
      )}
      {gold?.source && (
        <span className="font-bold text-cyan-400/90">
          {gold.feed === "tradingview"
            ? gold.source?.includes("FOREXCOM")
              ? "TradingView · FOREX.com"
              : "TradingView XAUUSD"
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
      {marketTechnical && (
        <span>
          Trend{" "}
          <span
            className={
              marketTechnical.trend === "bullish"
                ? "font-bold text-emerald-400"
                : marketTechnical.trend === "bearish"
                  ? "font-bold text-red-400"
                  : "text-amber-300"
            }
          >
            {marketTechnical.trend === "bullish"
              ? "↑"
              : marketTechnical.trend === "bearish"
                ? "↓"
                : "—"}
          </span>
          <span className="ml-1 text-[var(--term-muted)]">
            RSI {marketTechnical.rsi}
          </span>
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
      {newsAnalysis && (
        <span className="font-semibold text-[var(--term-gold)]">
          {newsAnalysis.tradeVerdictUz?.slice(0, 48) ?? newsAnalysis.recommendationUz.slice(0, 48)}
        </span>
      )}
      <span className={newsAnalysis ? "text-emerald-500/80" : "text-amber-500/90"}>
        {newsAnalysis ? "✓ Bashorat tayyor" : "⏳ Bashorat kutilmoqda"}
      </span>
      <span className="ml-auto text-[8px] text-[var(--term-muted)]">
        {gold?.feed === "tradingview"
          ? "Narx = TradingView chart"
          : "TradingView ulanmoqda…"}
      </span>
    </div>
  );
}
