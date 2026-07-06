import type { AiTradeSignal } from "../../../../shared/ai-trade-signal";
import type { MonitorSessionInfo, PriceData } from "../../../../shared/types";
import { getMarketSession } from "../../../../shared/market-session";
import { UZ } from "../../lib/uz";

interface Props {
  gold: PriceData | null;
  aiSignal?: AiTradeSignal | null;
  aiPhase?: MonitorSessionInfo["phase"];
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
  aiSignal,
  aiPhase,
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
  const liveOk = online && streamLive && !priceStale && !feedError;

  return (
    <header className="cine-topbar relative z-[2] shrink-0 border-b border-cyan-500/10 bg-black/60 backdrop-blur-md">
      <div className="flex h-9 flex-wrap items-center gap-2 px-3">
        <span className="font-cine text-xs tracking-widest text-amber-400" style={{ textShadow: "0 0 16px rgba(251,191,36,0.5)" }}>
          {UZ.appTitle}
        </span>

        {analyzing ? (
          <span className="font-cine text-[9px] tracking-wider text-violet-300 animate-pulse">SCANNING...</span>
        ) : (
          <button
            type="button"
            disabled={sessionBusy}
            onClick={onRequestForecast}
            className="cine-btn touch-target px-4 py-1.5 text-[9px] disabled:opacity-50"
          >
            {sessionBusy ? "…" : "▶ " + UZ.monitorForecast}
          </button>
        )}

        <span className={`flex items-center gap-1.5 text-[8px] font-bold ${liveOk ? "text-emerald-400" : "text-amber-400"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${liveOk ? "animate-pulse-dot bg-emerald-400" : "bg-amber-500"}`} />
          LIVE
          <span className="font-mono-ui font-normal text-slate-500">{lastUpdate}</span>
          {tickFlash > 0 && <span key={tickFlash} className="text-emerald-400/50">◆</span>}
        </span>

        <span className="text-[8px] text-slate-500">{session.nameUz}</span>

        {aiSignal && phase === "ready" && (
          <span
            className={`font-cine rounded px-2 py-0.5 text-[9px] tracking-wider ${
              aiSignal.action === "BUY"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : aiSignal.action === "SELL"
                  ? "bg-red-500/20 text-red-300 border border-red-500/40"
                  : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
            }`}
          >
            {aiSignal.action}
            {aiSignal.winProbability != null ? ` ${aiSignal.winProbability}%` : ""}
          </span>
        )}

        {translating && <span className="text-[8px] text-cyan-400">{UZ.translating}</span>}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[8px] text-slate-500">{username}</span>
          {onOpenSettings && (
            <button type="button" onClick={onOpenSettings} className="cine-btn-outline text-[8px]">
              {UZ.settings}
            </button>
          )}
          {isAdmin && onOpenAdmin && (
            <button type="button" onClick={onOpenAdmin} className="text-[8px] text-amber-400/80">
              Admin
            </button>
          )}
          <button type="button" onClick={onLogout} className="text-[8px] text-red-400/80">
            {UZ.logout}
          </button>
        </div>
      </div>
    </header>
  );
}
