import type { NewsMarketAnalysis, MarketQuote } from "../../../../shared/types";
import { TermCard } from "./TermCard";

interface Props {
  analysis: NewsMarketAnalysis | null;
  drivers: MarketQuote[];
}

const biasStyle = {
  bullish: "text-emerald-400 border-emerald-500/50 bg-emerald-950/30",
  bearish: "text-red-400 border-red-500/50 bg-red-950/30",
  neutral: "text-amber-300 border-amber-500/50 bg-amber-950/20",
};

export function MarketForecastHub({ analysis, drivers }: Props) {
  return (
    <TermCard title="Makro intel" subtitle="Yangiliklar · xavf · imkoniyat" accent="amber">
      <div className="term-scroll min-h-0 flex-1 space-y-2 p-2">
        {analysis ? (
          <>
            <div className="flex flex-wrap items-center gap-1">
              <span
                className={`rounded border px-2 py-0.5 text-[9px] font-black ${biasStyle[analysis.overallBias]}`}
              >
                {analysis.overallBias === "bullish"
                  ? "LONG"
                  : analysis.overallBias === "bearish"
                    ? "SHORT"
                    : "NEYTRAL"}{" "}
                {analysis.biasStrength}%
              </span>
              {analysis.newsCandleAligned ? (
                <span className="text-[8px] font-bold text-emerald-400">✓ Sham mos</span>
              ) : (
                <span className="text-[8px] font-bold text-amber-400">⚠ Mos emas</span>
              )}
            </div>

            <p className="rounded border border-[var(--term-gold)]/40 bg-amber-950/20 px-2 py-1 text-[9px] font-semibold leading-snug text-amber-50">
              {analysis.tradeVerdictUz ?? analysis.recommendationUz}
            </p>

            {analysis.contradictionsUz && (
              <p className="rounded border border-red-500/40 bg-red-950/40 px-1.5 py-1 text-[8px] font-bold text-red-200">
                ⛔ {analysis.contradictionsUz}
              </p>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded border border-red-900/40 bg-red-950/20 p-1">
                <p className="text-[7px] font-bold text-red-400">XAVFLAR</p>
                {analysis.risksUz.slice(0, 3).map((r, i) => (
                  <p key={i} className="text-[7px] text-red-200/90">
                    • {r.slice(0, 64)}
                  </p>
                ))}
              </div>
              <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-1">
                <p className="text-[7px] font-bold text-emerald-400">IMKONIYAT</p>
                {analysis.opportunitiesUz.slice(0, 3).map((o, i) => (
                  <p key={i} className="text-[7px] text-emerald-200/90">
                    • {o.slice(0, 64)}
                  </p>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-[9px] text-amber-400">Makro tahlil yuklanmoqda…</p>
        )}

        {drivers.length > 0 && (
          <div className="flex flex-wrap gap-0.5 border-t border-[var(--term-border)] pt-1.5">
            {drivers.slice(0, 8).map((d) => {
              const up = d.changePercent >= 0;
              const inv = /dollar|renta|yield|tnx/i.test(d.name);
              const good = inv ? !up : up;
              return (
                <span
                  key={d.symbol}
                  className={`rounded px-1 py-0 text-[7px] ${good ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"}`}
                  title={d.name}
                >
                  {d.name.split(" ")[0]} {up ? "+" : ""}
                  {d.changePercent}%
                </span>
              );
            })}
          </div>
        )}
      </div>
    </TermCard>
  );
}
