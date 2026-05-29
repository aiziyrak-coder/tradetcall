import type { M1ScalpLead } from "../../../../shared/m1-scalp";
import type { LiveMomentum } from "../../../../shared/scalp-signal-guard";
import type { PriceData, TechnicalAnalysis } from "../../../../shared/types";
import { RsiGauge } from "./RsiGauge";
import { TermCard } from "./TermCard";

interface Props {
  technical: TechnicalAnalysis | null | undefined;
  m1Scalp?: M1ScalpLead | null;
  liveMomentum?: LiveMomentum | null;
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

const phaseStyle: Record<string, string> = {
  forming: "text-violet-300",
  active: "text-emerald-400",
  exhausted: "text-amber-400",
  reversal: "text-orange-400",
  range: "text-slate-400",
};

export function TechnicalIndicatorsPanel({ technical, m1Scalp, liveMomentum, gold }: Props) {
  const price = gold?.price ?? 0;

  return (
    <TermCard title="M1 skalp" subtitle="Trend oldindan · RSI · ADX" accent="cyan">
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

            {liveMomentum && liveMomentum.direction !== "flat" && (
              <p
                className={`text-[8px] font-bold ${
                  liveMomentum.direction === "up" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {liveMomentum.summaryUz}
              </p>
            )}

            {m1Scalp && (
              <div className="rounded border border-violet-500/30 bg-violet-950/25 p-1.5">
                <p className="text-[7px] font-bold uppercase text-violet-300">M1 yo&apos;nalish</p>
                <p className="text-[9px] font-black text-white">
                  {m1Scalp.direction.toUpperCase()} · {m1Scalp.strength}%
                  <span className={`ml-1 font-semibold ${phaseStyle[m1Scalp.phase] ?? ""}`}>
                    {m1Scalp.phase}
                  </span>
                </p>
                <p className="text-[8px] leading-snug text-violet-100/90">{m1Scalp.nextMoveUz}</p>
                <p className="text-[7px] text-slate-500">{m1Scalp.emaCrossUz}</p>
              </div>
            )}

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
