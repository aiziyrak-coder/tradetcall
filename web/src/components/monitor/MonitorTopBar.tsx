import type {
  LongTermStrategy,
  MarketQuote,
  MonitorSessionInfo,
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
  monitorSession?: MonitorSessionInfo | null;
  sessionBusy?: boolean;
  onStartMonitor?: () => void;
  onStopMonitor?: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
}

export function MonitorTopBar({
  gold: _gold,
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
  monitorSession,
  sessionBusy,
  onStartMonitor,
  onStopMonitor,
  isAdmin,
  onOpenAdmin,
  onOpenSettings,
  onLogout,
}: Props) {
  const session = getMarketSession();
  const aiOn = monitorSession?.active ?? false;
  const liveOk = online && streamLive && !priceStale && !feedError;
  const remainMin = monitorSession?.active
    ? Math.ceil((monitorSession.remainingMs ?? 0) / 60_000)
    : 0;

  return (
    <header className="monitor-topbar shrink-0 border-b border-[var(--term-border)] bg-[var(--term-panel-2)]">
      <div className="flex h-8 flex-wrap items-center gap-2 px-2 py-0.5">
        <span className="font-display text-[10px] font-bold text-[var(--term-gold)]">{UZ.appTitle}</span>

        <div className="flex items-center gap-1">
          {!aiOn ? (
            <button
              type="button"
              disabled={sessionBusy}
              onClick={onStartMonitor}
              className="rounded bg-violet-600 px-2 py-0.5 text-[9px] font-black text-white disabled:opacity-50"
              title="Claude AI token — 30 daqiqadan keyin avto-o'chadi"
            >
              {sessionBusy ? "…" : UZ.monitorStart}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={sessionBusy}
                onClick={onStopMonitor}
                className="rounded bg-red-700/90 px-2 py-0.5 text-[9px] font-black text-white disabled:opacity-50"
              >
                {UZ.monitorStop}
              </button>
              <span className="text-[8px] font-bold text-violet-300">
                {UZ.monitorActive} · {remainMin}m
              </span>
            </>
          )}
          {!aiOn && (
            <span className="text-[8px] text-slate-500">
              {UZ.monitorAutoStop} {monitorSession?.autoStopMinutes ?? 30}m · narx/signallar doim
            </span>
          )}
        </div>

        <span
          className={`flex items-center gap-1 text-[9px] font-bold ${liveOk ? "text-emerald-400" : "text-amber-400"}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${liveOk ? "animate-pulse-dot bg-emerald-400" : "bg-amber-500"}`}
          />
          {liveOk ? "JONLI NARX" : streamLive ? "NARX KECHIKDI" : "UZILDI"}
          <span className="font-normal text-[var(--term-muted)]">{lastUpdate}</span>
          {tickFlash > 0 && (
            <span key={tickFlash} className="text-[8px] text-emerald-300/80">
              ●
            </span>
          )}
        </span>
        {translating && <span className="text-[8px] text-cyan-400">{UZ.translating}</span>}

        <span className="text-[8px] text-[var(--term-muted)]">{session.nameUz}</span>

        {shortStrategy?.verdict && (
          <span
            className={`rounded px-1.5 py-0 text-[8px] font-black ${
              shortStrategy.verdict.action === "BUY"
                ? "bg-emerald-700 text-white"
                : shortStrategy.verdict.action === "SELL"
                  ? "bg-red-700 text-white"
                  : "bg-amber-800 text-amber-100"
            }`}
          >
            YAQIN {shortStrategy.verdict.action}
          </span>
        )}

        {strategy?.verdict && (
          <span
            className={`rounded px-1.5 py-0 text-[8px] font-black ${
              strategy.verdict.action === "BUY"
                ? "bg-emerald-900/80 text-white"
                : strategy.verdict.action === "SELL"
                  ? "bg-red-900/80 text-white"
                  : "bg-amber-900/80 text-amber-100"
            }`}
          >
            UZOQ {strategy.verdict.action}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <DriversStrip drivers={drivers} />
          <span className="text-[8px] text-[var(--term-muted)]">{username}</span>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded border border-[var(--term-border)] px-1.5 py-0 text-[8px] text-slate-300"
            >
              ⚙
            </button>
          )}
          {isAdmin && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="rounded border border-amber-600/40 px-1.5 py-0 text-[8px] text-amber-300"
            >
              Admin
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="rounded border border-red-800/50 px-1.5 py-0 text-[8px] text-red-300"
          >
            {UZ.logout}
          </button>
        </div>
      </div>
    </header>
  );
}
