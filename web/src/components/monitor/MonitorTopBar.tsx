import type { LongTermStrategy, MarketQuote, PriceData, ShortTermStrategy } from "../../../../shared/types";
import { getMarketSession } from "../../../../shared/market-session";
import { DriversStrip } from "./DriversStrip";
import { UZ } from "../../lib/uz";

interface Props {
  gold: PriceData | null;
  strategy: LongTermStrategy | null;
  shortStrategy: ShortTermStrategy | null;
  drivers?: MarketQuote[];
  username: string;
  lastUpdate: string;
  online: boolean;
  priceStale?: boolean;
  feedError?: string | null;
  translating: boolean;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
}

const biasChip: Record<string, string> = {
  long: "bg-emerald-600 text-white",
  short: "bg-red-600 text-white",
  wait: "bg-amber-700 text-amber-950",
};

export function MonitorTopBar({
  gold,
  strategy,
  shortStrategy,
  drivers = [],
  username,
  lastUpdate,
  online,
  priceStale,
  feedError,
  translating,
  isAdmin,
  onOpenAdmin,
  onOpenSettings,
  onLogout,
}: Props) {
  const session = getMarketSession();
  const up = (gold?.change ?? 0) >= 0;
  const changeLabel =
    gold &&
    (Math.abs(gold.changePercent) >= 0.01
      ? `${up ? "+" : ""}${gold.changePercent.toFixed(2)}%`
      : `${up ? "+" : ""}${gold.change.toFixed(2)}`);

  const liveOk = online && !priceStale && !feedError;
  const shortReady = shortStrategy?.signal.status === "ready";
  const atr = shortStrategy?.signal.atr ?? strategy?.signal.atr ?? 0;

  return (
    <header className="monitor-topbar shrink-0 border-b border-[var(--term-border)] bg-[var(--term-panel-2)]">
      <div className="flex h-7 flex-wrap items-center gap-1.5 px-2 py-0.5">
        <span className="font-display text-[9px] font-bold text-[var(--term-gold)]">{UZ.appTitle}</span>

        <span className={`flex items-center gap-0.5 text-[8px] ${liveOk ? "text-emerald-400" : "text-red-400"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${liveOk ? "animate-pulse-dot bg-emerald-400" : "bg-red-500"}`} />
          {liveOk ? UZ.live : priceStale ? "KECH" : UZ.offline}
          <span className="text-[var(--term-muted)]">{lastUpdate}</span>
        </span>
        {translating && <span className="text-[8px] text-cyan-400">{UZ.translating}</span>}

        {gold && (
          <div className="font-mono-ui flex items-baseline gap-1">
            <span className="text-sm font-bold text-[var(--term-gold)]">${gold.price.toFixed(2)}</span>
            <span className={`text-[9px] font-bold ${up ? "text-emerald-400" : "text-red-400"}`}>
              {up ? "▲" : "▼"} {changeLabel}
            </span>
          </div>
        )}

        <span className="text-[8px]">
          <span className="text-[var(--term-muted)]">Sess </span>
          <span className={session.active ? "font-bold text-emerald-400" : "text-amber-400"}>
            {session.nameUz}
          </span>
        </span>

        {gold?.high24h != null && (
          <span className="font-mono-ui text-[8px]">
            <span className="text-emerald-400">${gold.high24h.toFixed(0)}</span>
            <span className="text-[var(--term-muted)]">/</span>
            <span className="text-red-400">${gold.low24h?.toFixed(0)}</span>
          </span>
        )}

        {atr > 0 && (
          <span className="text-[8px]">
            <span className="text-[var(--term-muted)]">ATR </span>
            <b className="text-[var(--term-gold)]">${atr}</b>
          </span>
        )}

        {shortStrategy && (
          <span
            className={`max-w-[140px] truncate rounded px-1 py-0 text-[8px] ${
              shortReady ? "ring-1 ring-emerald-400 bg-emerald-950/50" : "bg-black/30"
            }`}
          >
            Q: {shortStrategy.signal.actionUz}
          </span>
        )}

        {strategy && (
          <span className={`rounded px-1 py-0 text-[7px] font-bold ${biasChip[strategy.bias]}`}>
            UZ {strategy.bias.toUpperCase()}
          </span>
        )}

        <div className="flex-1" />

        <span className="text-[8px] text-cyan-400/90">{username}</span>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded border border-[var(--term-border)] px-1.5 py-0 text-[8px] text-[var(--term-text-2)]"
          >
            {UZ.settings}
          </button>
        )}
        {isAdmin && onOpenAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="rounded border border-violet-500/40 px-1.5 py-0 text-[8px] text-violet-300"
          >
            Admin
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="rounded border border-red-500/40 px-1.5 py-0 text-[8px] text-red-400"
        >
          {UZ.logout}
        </button>
      </div>
      <DriversStrip drivers={drivers} />
    </header>
  );
}
