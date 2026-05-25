import type {
  LongTermStrategy,
  MarketQuote,
  PriceData,
  ShortTermStrategy,
} from "../../../../shared/types";
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
  streamLive?: boolean;
  tickFlash?: number;
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
  streamLive,
  tickFlash = 0,
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

  const liveOk = online && streamLive && !priceStale && !feedError;

  return (
    <header className="monitor-topbar shrink-0 border-b border-[var(--term-border)] bg-[var(--term-panel-2)]">
      <div className="flex h-8 flex-wrap items-center gap-2 px-2 py-0.5">
        <span className="font-display text-[10px] font-bold text-[var(--term-gold)]">{UZ.appTitle}</span>

        <span
          className={`flex items-center gap-1 text-[9px] font-bold ${liveOk ? "text-emerald-400" : "text-amber-400"}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${liveOk ? "animate-pulse-dot bg-emerald-400" : "bg-amber-500"}`}
          />
          {liveOk ? "STREAM LIVE" : streamLive ? "NARX KECHIKDI" : "UZILDI"}
          <span className="font-normal text-[var(--term-muted)]">{lastUpdate}</span>
          {tickFlash > 0 && (
            <span key={tickFlash} className="text-[8px] text-emerald-300/80">
              ●
            </span>
          )}
        </span>
        {translating && <span className="text-[8px] text-cyan-400">{UZ.translating}</span>}

        {gold && (
          <div className="font-mono-ui flex items-baseline gap-1.5" key={gold.timestamp}>
            <span className="text-base font-bold text-[var(--term-gold)]">${gold.price.toFixed(2)}</span>
            <span className={`text-[10px] font-bold ${up ? "text-emerald-400" : "text-red-400"}`}>
              {up ? "▲" : "▼"} {changeLabel}
            </span>
          </div>
        )}

        <span className="text-[8px] text-[var(--term-muted)]">{session.nameUz}</span>

        {shortStrategy && (
          <span className="max-w-[160px] truncate text-[8px] font-bold text-cyan-300">
            Q: {shortStrategy.signal.actionUz}
          </span>
        )}
        {strategy && (
          <span className={`rounded px-1 py-0 text-[7px] font-bold ${biasChip[strategy.bias]}`}>
            UZ {strategy.bias.toUpperCase()}
          </span>
        )}

        <div className="flex-1" />

        <span className="text-[9px] text-cyan-400/90">{username}</span>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded border border-[var(--term-border)] px-1.5 py-0 text-[8px]"
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
