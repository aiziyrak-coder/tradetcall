import type { LongTermStrategy, PriceData, ShortTermStrategy } from "../../../../shared/types";
import { UZ } from "../../lib/uz";

interface Props {
  gold: PriceData | null;
  strategy: LongTermStrategy | null;
  shortStrategy: ShortTermStrategy | null;
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
  const up = (gold?.change ?? 0) >= 0;
  const changeLabel =
    gold &&
    (Math.abs(gold.changePercent) >= 0.01
      ? `${up ? "+" : ""}${gold.changePercent.toFixed(2)}%`
      : `${up ? "+" : ""}${gold.change.toFixed(2)}`);

  const liveOk = online && !priceStale && !feedError;
  const shortReady = shortStrategy?.signal.status === "ready";

  return (
    <header className="monitor-topbar shrink-0 border-b border-[var(--term-border)] bg-[var(--term-panel-2)]">
      <div className="flex min-h-10 flex-wrap items-center gap-2 px-3 py-1">
        <span className="font-display text-[11px] font-bold text-[var(--term-gold)]">{UZ.appTitle}</span>
        <span className="hidden text-[9px] text-[var(--term-muted)] xl:inline">{UZ.subtitle}</span>

        <span
          className={`flex items-center gap-1 text-[10px] ${liveOk ? "text-emerald-400" : "text-red-400"}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${liveOk ? "animate-pulse-dot bg-emerald-400" : "bg-red-500"}`}
          />
          {liveOk ? UZ.live : priceStale ? "KECHIKDI" : UZ.offline}
          <span className="text-[var(--term-muted)]">{lastUpdate}</span>
        </span>
        {translating && <span className="text-[10px] text-cyan-400">{UZ.translating}</span>}

        <div className="h-5 w-px bg-[var(--term-border)]" />

        {gold && (
          <div className="font-mono-ui flex items-baseline gap-2">
            <span className="text-lg font-bold text-[var(--term-gold)]">${gold.price.toFixed(2)}</span>
            <span className={`text-[11px] font-bold ${up ? "text-emerald-400" : "text-red-400"}`}>
              {up ? "▲" : "▼"} {changeLabel}
            </span>
          </div>
        )}

        {shortStrategy && (
          <div
            className={`rounded-md px-2 py-1 ${shortReady ? "ring-2 ring-emerald-400/80 bg-emerald-950/50" : "bg-black/30"}`}
          >
            <span className="text-[9px] text-[var(--term-muted)]">QISQA: </span>
            <span className="text-[11px] font-bold text-cyan-300">
              {shortStrategy.signal.actionUz}
            </span>
          </div>
        )}

        {strategy && (
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${biasChip[strategy.bias]}`}>
            UZ {strategy.bias.toUpperCase()}
          </span>
        )}

        <div className="flex-1" />

        <span className="text-[10px] text-cyan-400/90">{username}</span>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded border border-[var(--term-border)] px-2 py-1 text-[10px] text-[var(--term-text-2)] hover:text-[var(--term-gold)]"
          >
            {UZ.settings}
          </button>
        )}
        {isAdmin && onOpenAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="rounded border border-violet-500/40 px-2 py-1 text-[10px] text-violet-300 hover:border-violet-400/60"
          >
            Admin
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="rounded border border-red-500/40 px-2 py-1 text-[10px] text-red-400"
        >
          {UZ.logout}
        </button>
      </div>
    </header>
  );
}
