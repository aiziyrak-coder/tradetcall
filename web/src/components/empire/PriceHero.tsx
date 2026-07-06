import { motion } from "framer-motion";
import type { PriceData } from "../../../../shared/types";
import type { NewsMarketAnalysis } from "../../../../shared/types";
import type { AiTradeSignal } from "../../../../shared/ai-trade-signal";

interface Props {
  gold: PriceData | null;
  tickFlash: number;
  signal: AiTradeSignal | null;
  analysis: NewsMarketAnalysis | null;
}

function changeLabel(gold: PriceData) {
  const up = gold.change >= 0;
  const tick = gold.tickDelta ?? 0;
  if (Math.abs(tick) >= 0.01) {
    return {
      main: `${tick >= 0 ? "+" : "−"}$${Math.abs(tick).toFixed(2)}`,
      sub: `(${up ? "+" : ""}${gold.changePercent.toFixed(2)}%)`,
      up: tick >= 0,
    };
  }
  return {
    main: `${up ? "+" : "−"}$${Math.abs(gold.change).toFixed(2)}`,
    sub: `(${up ? "+" : ""}${gold.changePercent.toFixed(2)}%)`,
    up,
  };
}

export function PriceHero({ gold, tickFlash, signal, analysis }: Props) {
  const ch = gold ? changeLabel(gold) : null;
  const macro = analysis?.overallBias;
  const bias =
    signal?.forecastBiasUz ??
    (macro === "bullish" ? "↑ LONG" : macro === "bearish" ? "↓ SHORT" : signal?.action === "BUY" ? "↑ LONG" : signal?.action === "SELL" ? "↓ SHORT" : null);
  const biasUp = bias?.includes("LONG") || bias?.includes("BUY");

  return (
    <div className="empire-price-hero">
      <p className="empire-price-hero__label">XAUUSD · OLTIN</p>

      {gold ? (
        <motion.div
          key={`${gold.price}-${tickFlash}`}
          className="empire-price-flash"
          initial={{ scale: 0.96 }}
          animate={{ scale: 1 }}
        >
          <p className="empire-price-hero__value">${gold.price.toFixed(2)}</p>
          {ch && (
            <p className={`empire-price-hero__chg ${ch.up ? "up" : "down"}`}>
              {ch.up ? "▲" : "▼"} {ch.main}{" "}
              <span className="opacity-70">{ch.sub}</span>
            </p>
          )}
        </motion.div>
      ) : (
        <p className="empire-price-hero__value opacity-30">—</p>
      )}

      {bias && (
        <span className={`empire-bias-pill ${biasUp ? "long" : "short"}`}>{bias}</span>
      )}
    </div>
  );
}
