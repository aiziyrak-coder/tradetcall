import type { AiTradeSignal } from "../../../../shared/ai-trade-signal";
import type { MarketQuote, MonitorSessionInfo, PriceData } from "../../../../shared/types";
import { getMarketSession } from "../../../../shared/market-session";
import { DriversStrip } from "./DriversStrip";
import { UZ } from "../../lib/uz";

interface Props {
  gold: PriceData | null;
  aiSignal?: AiTradeSignal | null;
  aiPhase?: MonitorSessionInfo["phase"];
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
  onRequestForecast?: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
}

export function MonitorTopBar({
  gold: _gold,
  aiSignal,
  aiPhase,
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
  onRequestForecast,
  isAdmin,
  onOpenAdmin,
  onOpenSettings,
  onLogout,
}: Props) {
  const session = getMarketSession();
  const phase = aiPhase ?? monitorSession?.phase ?? "idle";
  const analyzing = phase === "analyzing";
  const ready = phase === "ready" && aiSignal;
  const liveOk = online && streamLive && !priceStale && !feedError;

  return (
    <header className="monitor-topbar shrink-0 border-b border-[var(--term-border)] bg-[var(--term-panel-2)]">
      <div className="flex h-8 flex-wrap items-center gap-2 px-2 py-0.5">
        <span className="font-display text-[11px] font-bold tracking-wide text-[var(--term-gold)]">
          {UZ.appTitle}
        </span>
        <span className="hidden text-[7px] text-[var(--term-muted)] sm:inline">{UZ.subtitle}</span>

        <div className="flex items-center gap-1">
          {analyzing ? (
            <span className="text-[8px] font-bold text-violet-300">{UZ.monitorActive}</span>
          ) : (
            <button
              type="button"
              disabled={sessionBusy}
              onClick={onRequestForecast}
              className="btn-ai-forecast touch-target rounded-md px-2.5 py-1 text-[9px] font-black text-white disabled:opacity-50"
              title="Bir martalik AI tahlil — faqat bosganda token sarflanadi"
            >
              {sessionBusy ? "…" : UZ.monitorForecast}
            </button>
          )}
          {!analyzing && (
            <span className="text-[8px] text-slate-500">
              {ready ? UZ.monitorReady : UZ.monitorIdle} · {UZ.monitorOneShot}
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

        {aiSignal && phase === "ready" && (
          <span
            className={`rounded px-1.5 py-0 text-[8px] font-black ${
              aiSignal.action === "BUY"
                ? "bg-emerald-700 text-white"
                : aiSignal.action === "SELL"
                  ? "bg-red-700 text-white"
                  : "bg-amber-800 text-amber-100"
            }`}
          >
            AI {aiSignal.action}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <DriversStrip drivers={drivers} />
          <span className="text-[8px] text-[var(--term-muted)]">{username}</span>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="touch-target rounded border border-cyan-600/50 bg-cyan-950/40 px-2 py-0.5 text-[8px] font-bold text-cyan-200"
              title="API kalit va bildirishnomalar"
            >
              {UZ.settings}
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
