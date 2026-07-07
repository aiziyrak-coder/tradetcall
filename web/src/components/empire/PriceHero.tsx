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
    (macro === "bullish" ? "↑ LONG" : macro === "bearish" ? "↓ SHORT" : null);

  return (
    <div className="empire-price-hero">
      <p className="empire-price-hero__label">XAUUSD · OLTIN</p>
      {gold ? (
        <div key={`${gold.price}-${tickFlash}`} className="empire-price-flash">
          <p className="empire-price-hero__value">${gold.price.toFixed(2)}</p>
          {ch && (
            <p className={`empire-price-hero__chg ${ch.up ? "up" : "down"}`}>
              {ch.up ? "▲" : "▼"} {ch.main} <span>{ch.sub}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="empire-price-flash">
          <p className="empire-price-hero__value opacity-30">—</p>
        </div>
      )}
      {bias && <span className="empire-bias-pill">{bias}</span>}
    </div>
  );
}
