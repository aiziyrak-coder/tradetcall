import { motion } from "framer-motion";
import type { PriceData } from "../../../../shared/types";

interface Props {
  gold: PriceData | null;
  lastUpdate: string;
  liveOk: boolean;
  tickerText: string;
}

function Waveform() {
  return (
    <svg className="empire-waveform" viewBox="0 0 60 20" aria-hidden>
      {[3, 8, 5, 12, 7, 14, 6, 10, 4, 9, 6, 11].map((h, i) => (
        <motion.rect
          key={i}
          x={i * 5}
          y={10 - h / 2}
          width="3"
          height={h}
          rx="1"
          fill="#ffd54a"
          animate={{ height: [h, h * 1.4, h * 0.7, h], y: [10 - h / 2, 10 - (h * 1.4) / 2, 10 - (h * 0.7) / 2, 10 - h / 2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08 }}
        />
      ))}
    </svg>
  );
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
        SERVER STATUS · {liveOk ? "ONLINE" : "OFFLINE"}
      </span>
      <span className="empire-footer__time">LAST UPDATE: {lastUpdate.split(" · ")[0]}</span>
      <Waveform />
    </footer>
  );
}
