import { motion } from "framer-motion";
import type { PriceData } from "../../../../shared/types";
import type { AiTradeSignal } from "../../../../shared/ai-trade-signal";

interface Props {
  gold: PriceData | null;
  tickFlash: number;
  signal: AiTradeSignal | null;
}

function changeLabel(gold: PriceData) {
  const up = gold.change >= 0;
  const tick = gold.tickDelta ?? 0;
  if (Math.abs(tick) >= 0.01) {
    return { text: `${tick >= 0 ? "+" : "−"}$${Math.abs(tick).toFixed(2)}`, up: tick >= 0 };
  }
  if (Math.abs(gold.changePercent) >= 0.01) {
    return {
      text: `(${up ? "+" : ""}${gold.changePercent.toFixed(2)}%)`,
      up,
      main: `${up ? "+" : "−"}$${Math.abs(gold.change).toFixed(2)}`,
    };
  }
  return {
    text: `(${up ? "+" : ""}${gold.changePercent.toFixed(2)}%)`,
    up,
    main: `${up ? "+" : "−"}$${Math.abs(gold.change).toFixed(2)}`,
  };
}

export function PriceHero({ gold, tickFlash, signal }: Props) {
  const ch = gold ? changeLabel(gold) : null;
  const bias =
    signal?.forecastBiasUz ??
    (signal?.action === "BUY" ? "↑ LONG" : signal?.action === "SELL" ? "↓ SHORT" : null);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
      <motion.p
        className="text-[10px] tracking-[0.4em] text-[#ffd54a]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        XAUUSD · OLTIN
      </motion.p>

      {gold ? (
        <motion.div
          key={`${gold.price}-${tickFlash}`}
          className="empire-price-flash"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <p className="empire-glow-text font-['Syncopate'] text-[clamp(2rem,5vw,3.2rem)] font-bold leading-none">
            ${gold.price.toFixed(2)}
          </p>
          {ch && (
            <p className={`mt-2 text-sm font-semibold ${ch.up ? "text-[#ffe88b]" : "text-[#ff6b4a]"}`}>
              {ch.up ? "▲" : "▼"} {ch.main ?? ch.text}{" "}
              {ch.main && <span className="text-[10px] opacity-70">{ch.text}</span>}
            </p>
          )}
        </motion.div>
      ) : (
        <p className="text-3xl text-[rgba(255,232,139,0.3)]">—</p>
      )}

      {bias && (
        <motion.span
          className="pointer-events-auto mt-4 border border-[rgba(255,213,74,0.35)] px-4 py-1 text-[10px] tracking-[0.15em] text-[#ffd54a]"
          style={{
            background: "rgba(255,213,74,0.08)",
            boxShadow: "0 0 20px rgba(255,184,0,0.2)",
            borderRadius: "4px",
          }}
          whileHover={{ scale: 1.05 }}
        >
          {bias}
        </motion.span>
      )}
    </div>
  );
}
