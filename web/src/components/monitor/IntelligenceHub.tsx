import type { MarketQuote, NewsMarketAnalysis } from "../../../../shared/types";

interface Props {
  analysis: NewsMarketAnalysis | null;
  drivers: MarketQuote[];
  macroWarningUz?: string | null;
  calendarSourceUz?: string | null;
}

const biasStyle = {
  bullish: "text-emerald-400 border-emerald-500/50",
  bearish: "text-red-400 border-red-500/50",
  neutral: "text-amber-300 border-amber-500/50",
};

/** Yangiliklar markazi — signal faqat chap Uzoq/Yaqin panelda */
export function IntelligenceHub({ analysis, drivers, macroWarningUz, calendarSourceUz }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-violet-500/25 bg-[var(--term-panel)]">
      <div className="shrink-0 border-b border-[var(--term-border)] bg-[var(--term-panel-2)] px-2 py-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
          Yangiliklar markazi
        </span>
        <p className="text-[7px] text-[var(--term-muted)]">
          BUY/SELL faqat Uzoq/Yaqin — 7 filter MOS bo&apos;lganda
        </p>
      </div>

      <div className="term-scroll min-h-0 flex-1 space-y-2 p-2">
        {macroWarningUz && (
          <p className="rounded border border-amber-500/40 bg-amber-950/30 px-2 py-1 text-[8px] text-amber-200">
            ⚠ Makro: {macroWarningUz}
          </p>
        )}
        {calendarSourceUz && (
          <p className="text-[7px] text-slate-500">Taqvim: {calendarSourceUz}</p>
        )}
        {analysis ? (
          <>
            <div className="flex flex-wrap items-center gap-1">
              <span
                className={`rounded border px-1.5 py-0 text-[9px] font-black ${biasStyle[analysis.overallBias]}`}
              >
                {analysis.overallBias.toUpperCase()} {analysis.biasStrength}%
              </span>
              <span className="text-[8px] text-[var(--term-muted)]">
                ishonch {analysis.confidence}% · B{analysis.bullCount}/S{analysis.bearCount}
              </span>
              {analysis.newsCandleAligned ? (
                <span className="text-[8px] font-bold text-emerald-400">✓ Sham MOS</span>
              ) : (
                <span className="text-[8px] font-bold text-red-400">✗ Sham mos emas</span>
              )}
            </div>

            <p className="rounded border border-violet-500/30 bg-violet-950/30 px-1.5 py-1 text-[9px] font-bold text-violet-100">
              {analysis.tradeVerdictUz ?? analysis.recommendationUz}
            </p>

            {analysis.contradictionsUz && (
              <p className="rounded border border-red-500/40 bg-red-950/40 px-1.5 py-1 text-[9px] font-bold text-red-200">
                ⛔ {analysis.contradictionsUz}
              </p>
            )}

            <p className="text-[8px] leading-snug text-[var(--term-text)]">{analysis.trendOutlookUz}</p>
            <p className="text-[8px] leading-snug text-[var(--term-text-2)]">{analysis.narrativeUz.slice(0, 500)}</p>

            {analysis.futureFactors.length > 0 && (
              <div>
                <p className="mb-0.5 text-[8px] font-bold uppercase text-[var(--term-muted)]">Omillar</p>
                {analysis.futureFactors.slice(0, 6).map((f) => (
                  <p key={f.id} className="text-[8px] text-[var(--term-text-2)]">
                    <span
                      className={
                        f.direction === "bullish"
                          ? "text-emerald-400"
                          : f.direction === "bearish"
                            ? "text-red-400"
                            : "text-amber-400"
                      }
                    >
                      {f.nameUz}
                    </span>
                    : {f.explanationUz.slice(0, 80)}
                  </p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-1">
              <div>
                <p className="text-[7px] font-bold text-red-400">XAVFLAR</p>
                {analysis.risksUz.slice(0, 4).map((r, i) => (
                  <p key={i} className="text-[7px] text-red-200/90">
                    • {r.slice(0, 65)}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-[7px] font-bold text-emerald-400">IMKONIYAT</p>
                {analysis.opportunitiesUz.slice(0, 4).map((o, i) => (
                  <p key={i} className="text-[7px] text-emerald-200/90">
                    • {o.slice(0, 65)}
                  </p>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-[9px] text-amber-400">Yangiliklar yuklanmoqda — signal HOLD.</p>
        )}

        {drivers.length > 0 && (
          <div className="border-t border-[var(--term-border)] pt-1">
            <p className="mb-0.5 text-[8px] font-bold uppercase text-[var(--term-muted)]">Makro</p>
            <div className="flex flex-wrap gap-0.5">
              {drivers.slice(0, 10).map((d) => {
                const up = d.changePercent >= 0;
                const inv = /dollar|renta|yield|tnx/i.test(d.name);
                const good = inv ? !up : up;
                return (
                  <span
                    key={d.symbol}
                    className={`rounded px-1 py-0 text-[7px] ${good ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"}`}
                  >
                    {d.name.split(" ")[0]} {up ? "+" : ""}
                    {d.changePercent}%
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
