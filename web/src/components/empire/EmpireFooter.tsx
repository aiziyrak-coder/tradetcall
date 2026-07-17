import type { PriceData } from "../../../../shared/types";
import type { ConnStatus } from "../../store/monitor-store";

interface Props {
  gold: PriceData | null;
  lastUpdate: string;
  liveOk: boolean;
  connStatus: ConnStatus;
  tickerText: string;
}

export function EmpireFooter({ gold, lastUpdate, liveOk, connStatus, tickerText }: Props) {
  const pct = gold ? `${gold.changePercent >= 0 ? "+" : ""}${gold.changePercent.toFixed(2)}%` : "—";

  let statusLabel = "○ OFFLINE";
  let statusClass = "";
  if (connStatus === "reconnecting") {
    statusLabel = "● OFFLINE — qayta ulanmoqda…";
    statusClass = "reconnect";
  } else if (liveOk || connStatus === "online") {
    statusLabel = "● ONLINE";
    statusClass = "on";
  }

  return (
    <footer className="empire-footer">
      <span className="empire-footer__pair">XAU/USD {pct}</span>
      <div className="empire-footer__ticker-wrap">
        <div className="empire-footer__ticker">
          <span>{tickerText}</span>
          <span>{tickerText}</span>
        </div>
      </div>
      <span className={`empire-footer__status ${statusClass}`}>{statusLabel}</span>
      <span className="empire-footer__time">{lastUpdate.split(" · ")[0]}</span>
      <p className="empire-disclaimer">
        Bu signal faqat ma'lumot maqsadida, moliyaviy maslahat emas. Treding yuqori xavf bilan bog'liq.
      </p>
    </footer>
  );
}
