import type { PriceData, ShortTermStrategy, LongTermStrategy } from "../../../../shared/types";
import { getMarketSession } from "../../../../shared/market-session";

interface Props {
  gold: PriceData | null;
  shortStrategy: ShortTermStrategy | null;
  longStrategy: LongTermStrategy | null;
}

export function MarketContextBar({ gold, shortStrategy, longStrategy }: Props) {
  const session = getMarketSession();
  const price = gold?.price ?? 0;
  const atr = shortStrategy?.signal.atr ?? longStrategy?.signal.atr ?? 0;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--term-border)] bg-[var(--term-panel-2)] px-3 py-1.5 text-[10px]">
      <span>
        <span className="text-[var(--term-muted)]">Sessiya: </span>
        <span className={session.active ? "font-bold text-emerald-400" : "text-amber-400"}>
          {session.nameUz}
        </span>
      </span>
      <span className="text-[var(--term-muted)]">|</span>
      <span title={session.hintUz}>
        <span className="text-[var(--term-muted)]">Volatillik: </span>
        <span className="font-medium text-[var(--term-text)]">{session.volatility}</span>
      </span>
      {gold?.high24h != null && gold?.low24h != null && (
        <>
          <span className="text-[var(--term-muted)]">|</span>
          <span>
            <span className="text-[var(--term-muted)]">24s: </span>
            <span className="text-emerald-400">${gold.high24h.toFixed(2)}</span>
            <span className="text-[var(--term-muted)]"> / </span>
            <span className="text-red-400">${gold.low24h.toFixed(2)}</span>
          </span>
        </>
      )}
      {atr > 0 && (
        <>
          <span className="text-[var(--term-muted)]">|</span>
          <span>
            <span className="text-[var(--term-muted)]">ATR: </span>
            <span className="font-mono-ui font-semibold text-[var(--term-gold)]">${atr}</span>
          </span>
        </>
      )}
      {shortStrategy && (
        <>
          <span className="text-[var(--term-muted)]">|</span>
          <span>
            <span className="text-[var(--term-muted)]">QM TF: </span>
            <span className="font-bold text-cyan-400">
              {shortStrategy.tfAligned}/{shortStrategy.tfTotal}
            </span>
          </span>
        </>
      )}
      {price > 0 && shortStrategy?.signal && (
        <>
          <span className="text-[var(--term-muted)]">|</span>
          <span>
            <span className="text-[var(--term-muted)]">Kirishgacha: </span>
            <span className="font-mono-ui font-semibold">
              ${shortStrategy.signal.distanceToEntry.toFixed(2)} ({shortStrategy.signal.distancePct}%)
            </span>
          </span>
        </>
      )}
      <span className="ml-auto text-[9px] text-[var(--term-muted)]">
        Spot · real vaqt · spread brokerda farq qilishi mumkin
      </span>
    </div>
  );
}
