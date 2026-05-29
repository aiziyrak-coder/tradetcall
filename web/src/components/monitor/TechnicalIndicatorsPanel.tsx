import type { PriceData, TechnicalAnalysis } from "../../../../shared/types";
import { RsiGauge } from "./RsiGauge";
import { TermCard } from "./TermCard";

interface Props {
  technical: TechnicalAnalysis | null | undefined;
  gold: PriceData | null;
}

const trendStyle = {
  bullish: "text-emerald-400",
  bearish: "text-red-400",
  neutral: "text-amber-300",
};

const trendLabel = {
  bullish: "YUQORI",
  bearish: "PAST",
  neutral: "NEYTRAL",
};

export function TechnicalIndicatorsPanel({ technical, gold }: Props) {
  const price = gold?.price ?? 0;

  return (
    <TermCard title="Indikatorlar" subtitle="RSI · ADX · ATR · darajalar" accent="cyan">
      <div className="p-2">
        {!technical ? (
          <p className="text-[8px] text-amber-400">Shamlar yuklanmoqda…</p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-[9px]">
              <span>
                Trend{" "}
                <span className={`font-black ${trendStyle[technical.trend]}`}>
                  {trendLabel[technical.trend]}
                </span>
              </span>
              <span>
                ADX <span className="font-mono-ui font-bold">{technical.adx}</span>
              </span>
              <span>
                ATR{" "}
                <span className="font-mono-ui font-bold text-[var(--term-gold)]">${technical.atr}</span>
              </span>
            </div>

            <RsiGauge rsi={technical.rsi} />

            <div className="flex flex-wrap gap-3 text-[8px] text-slate-300">
              <span>
                SMA20{" "}
                <span className="font-mono-ui text-[var(--term-gold)]">${technical.sma20.toFixed(2)}</span>
              </span>
              <span>
                SMA50 <span className="font-mono-ui">${technical.sma50.toFixed(2)}</span>
              </span>
              {price > 0 && (
                <span className={price >= technical.sma20 ? "text-emerald-400" : "text-red-400"}>
                  Narx {price >= technical.sma20 ? "SMA20 dan yuqori" : "SMA20 dan past"}
                </span>
              )}
            </div>

            <p className="text-[8px] leading-snug text-slate-400">{technical.momentum}</p>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-emerald-900/30 bg-emerald-950/15 p-1.5">
                <p className="text-[7px] font-bold text-emerald-400">Qo&apos;llab-quvvatlash</p>
                {technical.support.slice(0, 3).map((p, i) => (
                  <p key={i} className="font-mono-ui text-[8px] text-emerald-300/90">
                    ${p.toFixed(2)}
                  </p>
                ))}
              </div>
              <div className="rounded border border-red-900/30 bg-red-950/15 p-1.5">
                <p className="text-[7px] font-bold text-red-400">Qarshilik</p>
                {technical.resistance.slice(0, 3).map((p, i) => (
                  <p key={i} className="font-mono-ui text-[8px] text-red-300/90">
                    ${p.toFixed(2)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </TermCard>
  );
}
