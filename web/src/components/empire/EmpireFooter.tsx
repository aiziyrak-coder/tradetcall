import type { PriceData } from "../../../../shared/types";

interface Props {
  gold: PriceData | null;
  lastUpdate: string;
  liveOk: boolean;
  tickerText: string;
}

export function EmpireFooter({ gold, lastUpdate, liveOk, tickerText }: Props) {
  const pct = gold ? `${gold.changePercent >= 0 ? "+" : ""}${gold.changePercent.toFixed(2)}%` : "—";

  return (
    <footer className="empire-footer">
      <span className="empire-footer__pair">XAU/USD {pct}</span>
      <div className="empire-footer__ticker-wrap">
        <div className="empire-footer__ticker">
          <span>{tickerText}</span>
          <span>{tickerText}</span>
        </div>
      </div>
      <span className={`empire-footer__status ${liveOk ? "on" : ""}`}>
        {liveOk ? "● ONLINE" : "○ OFFLINE"}
      </span>
      <span className="empire-footer__time">{lastUpdate.split(" · ")[0]}</span>
    </footer>
  );
}
