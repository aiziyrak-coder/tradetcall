import type { MarketQuote, NewsMarketAnalysis } from "../../../../shared/types";

interface Props {
  analysis: NewsMarketAnalysis | null;
  drivers: MarketQuote[];
  analyzing: boolean;
  hasApiKey: boolean;
  onDeepAnalysis: () => void;
}

const biasStyle = {
  bullish: "text-emerald-400 border-emerald-500/50",
  bearish: "text-red-400 border-red-500/50",
  neutral: "text-amber-300 border-amber-500/50",
};

/** Faqat yangiliklar markazi — signal/tahlil strategiya panelida */
export function IntelligenceHub({ analysis, drivers, analyzing, hasApiKey, onDeepAnalysis }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-violet-500/25 bg-[var(--term-panel)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--term-border)] bg-[var(--term-panel-2)] px-2 py-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
          Yangiliklar markazi
        </span>
        <button
          type="button"
          onClick={onDeepAnalysis}
          disabled={analyzing || !hasApiKey}
          className="rounded bg-violet-800 px-2 py-0.5 text-[8px] font-bold disabled:opacity-40"
        >
          {analyzing ? "AI…" : "AI chuqur"}
        </button>
      </div>

      <div className="term-scroll min-h-0 flex-1 space-y-2 p-2">
        <p className="text-[8px] text-[var(--term-muted)]">
          BUY/SELL/HOLD faqat chap panelda (Uzoq / Yaqin). Bu yerda — barcha yangiliklar fonini bitta joyda.
        </p>

        {analysis ? (
          <>
            <div className="flex flex-wrap items-center gap-1">
              <span
                className={`rounded border px-1.5 py-0 text-[9px] font-black ${biasStyle[analysis.overallBias]}`}
              >
                MAKRO {analysis.overallBias.toUpperCase()} {analysis.biasStrength}%
              </span>
              <span className="text-[8px] text-[var(--term-muted)]">
                B{analysis.bullCount}/S{analysis.bearCount} · ishonch {analysis.confidence}%
              </span>
              {analysis.newsCandleAligned ? (
                <span className="text-[8px] font-bold text-emerald-400">Sham MOS</span>
              ) : (
                <span className="text-[8px] font-bold text-amber-400">Sham mos emas</span>
              )}
            </div>

            {analysis.contradictionsUz && (
              <p className="rounded border border-red-500/40 bg-red-950/40 px-1.5 py-1 text-[9px] font-bold text-red-200">
                ⛔ {analysis.contradictionsUz}
              </p>
            )}

            {analysis.futureFactors.length > 0 && (
              <div>
                <p className="mb-0.5 text-[8px] font-bold uppercase text-[var(--term-muted)]">
                  Kelajak omillar (signalga ta'sir)
                </p>
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
                    : {f.explanationUz.slice(0, 85)}
                  </p>
                ))}
              </div>
            )}

            {(analysis.risksUz.length > 0 || analysis.opportunitiesUz.length > 0) && (
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <p className="text-[7px] font-bold text-red-400">XAVFLAR</p>
                  {analysis.risksUz.slice(0, 4).map((r, i) => (
                    <p key={i} className="text-[7px] text-red-200/90">
                      • {r.slice(0, 70)}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-[7px] font-bold text-emerald-400">IMKONIYAT</p>
                  {analysis.opportunitiesUz.slice(0, 4).map((o, i) => (
                    <p key={i} className="text-[7px] text-emerald-200/90">
                      • {o.slice(0, 70)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {analysis.narrativeUz && (
              <p className="text-[8px] leading-snug text-[var(--term-text)]">
                {analysis.narrativeUz.length > 400
                  ? `${analysis.narrativeUz.slice(0, 400)}…`
                  : analysis.narrativeUz}
              </p>
            )}

            {analysis.aiDiscussionUz && (
              <p className="rounded bg-violet-950/30 px-1.5 py-1 text-[8px] text-violet-100">
                {analysis.aiDiscussionUz}
              </p>
            )}
          </>
        ) : (
          <p className="text-[9px] text-amber-400">Yangiliklar tahlili kutilmoqda — signal HOLD bo‘ladi.</p>
        )}

        {drivers.length > 0 && (
          <div className="border-t border-[var(--term-border)] pt-1">
            <p className="mb-0.5 text-[8px] font-bold uppercase text-[var(--term-muted)]">Makro drayverlar</p>
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
