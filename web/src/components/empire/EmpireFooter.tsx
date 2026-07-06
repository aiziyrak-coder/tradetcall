import { motion } from "framer-motion";
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
    <motion.footer
      className="relative z-30 flex shrink-0 items-center gap-4 border-t border-[rgba(255,213,74,0.1)] px-4 py-2 text-[9px] tracking-wider"
      style={{ background: "rgba(0,0,0,0.8)" }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <span className="shrink-0 font-['JetBrains_Mono'] font-semibold text-[#ffd54a]">
        XAU/USD {pct}
      </span>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="flex whitespace-nowrap" style={{ animation: "empire-ticker 30s linear infinite" }}>
          <span className="pr-16 text-[rgba(255,232,139,0.45)]">{tickerText}</span>
          <span className="pr-16 text-[rgba(255,232,139,0.45)]">{tickerText}</span>
        </div>
      </div>

      <span className={`shrink-0 ${liveOk ? "text-[#ffd54a]" : "text-[#ff6b4a]"}`}>
        SERVER {liveOk ? "● ONLINE" : "○ OFFLINE"}
      </span>
      <span className="shrink-0 font-['JetBrains_Mono'] text-[rgba(255,232,139,0.4)]">
        YANGILANDI: {lastUpdate.split(" · ")[0]}
      </span>
    </motion.footer>
  );
}
