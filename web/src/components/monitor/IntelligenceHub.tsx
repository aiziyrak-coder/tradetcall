import type {
  LongTermStrategy,
  MarketQuote,
  NewsMarketAnalysis,
  ShortTermStrategy,
} from "../../../../shared/types";

interface Props {
  analysis: NewsMarketAnalysis | null;
  drivers: MarketQuote[];
  longStrategy: LongTermStrategy | null;
  shortStrategy: ShortTermStrategy | null;
  analyzing: boolean;
  hasApiKey: boolean;
  onDeepAnalysis: () => void;
}

const biasStyle = {
  bullish: "text-emerald-400 border-emerald-500/50",
  bearish: "text-red-400 border-red-500/50",
  neutral: "text-amber-300 border-amber-500/50",
};

export function IntelligenceHub({
  analysis,
  drivers,
  longStrategy,
  shortStrategy,
  analyzing,
  hasApiKey,
  onDeepAnalysis,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-cyan-500/25 bg-[var(--term-panel)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--term-border)] bg-[var(--term-panel-2)] px-2 py-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
          Tahlil · Bashorat · Signal
        </span>
        <button
          type="button"
          onClick={onDeepAnalysis}
          disabled={analyzing || !hasApiKey}
          className="rounded bg-cyan-800 px-2 py-0.5 text-[8px] font-bold disabled:opacity-40"
        >
          {analyzing ? "AI…" : "AI chuqur"}
        </button>
      </div>

      <div className="term-scroll min-h-0 flex-1 space-y-2 p-2">
        {analysis ? (
          <>
            <div className="flex flex-wrap items-center gap-1">
              <span
                className={`rounded border px-1.5 py-0 text-[9px] font-black ${biasStyle[analysis.overallBias]}`}
              >
                {analysis.overallBias.toUpperCase()} {analysis.biasStrength}%
              </span>
              <span className="text-[8px] text-[var(--term-muted)]">
                B{analysis.bullCount}/S{analysis.bearCount} · {analysis.confidence}%
              </span>
              {analysis.newsCandleAligned ? (
                <span className="text-[8px] font-bold text-emerald-400">Yangilik+sham MOS</span>
              ) : (
                <span className="text-[8px] font-bold text-amber-400">Mos emas</span>
              )}
            </div>

            {analysis.tradeVerdictUz && (
              <p className="rounded border border-amber-500/30 bg-amber-950/40 px-1.5 py-1 text-[9px] font-bold text-amber-100">
                {analysis.tradeVerdictUz}
              </p>
            )}
            {analysis.forecastUz && (
              <p className="text-[9px] font-semibold text-cyan-200">{analysis.forecastUz}</p>
            )}
            <p className="text-[9px] leading-snug text-[var(--term-text)]">{analysis.recommendationUz}</p>
            <p className="text-[8px] leading-snug text-[var(--term-text-2)]">{analysis.trendOutlookUz}</p>
            {analysis.narrativeUz && (
              <p className="text-[8px] leading-snug text-[var(--term-muted)]">
                {analysis.narrativeUz.length > 300
                  ? `${analysis.narrativeUz.slice(0, 300)}…`
                  : analysis.narrativeUz}
              </p>
            )}

            {analysis.futureFactors.length > 0 && (
              <div>
                <p className="mb-0.5 text-[8px] font-bold uppercase text-[var(--term-muted)]">Kelajak omillar</p>
                {analysis.futureFactors.slice(0, 4).map((f) => (
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
                    : {f.explanationUz.slice(0, 70)}
                  </p>
                ))}
              </div>
            )}

            {(analysis.risksUz.length > 0 || analysis.opportunitiesUz.length > 0) && (
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <p className="text-[7px] font-bold text-red-400">XAVFLAR</p>
                  {analysis.risksUz.slice(0, 3).map((r, i) => (
                    <p key={i} className="text-[7px] text-red-200/90">
                      • {r.slice(0, 60)}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-[7px] font-bold text-emerald-400">IMKONIYAT</p>
                  {analysis.opportunitiesUz.slice(0, 3).map((o, i) => (
                    <p key={i} className="text-[7px] text-emerald-200/90">
                      • {o.slice(0, 60)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {analysis.aiDiscussionUz && (
              <p className="rounded bg-cyan-950/30 px-1.5 py-1 text-[8px] text-cyan-100">{analysis.aiDiscussionUz}</p>
            )}
          </>
        ) : (
          <p className="text-[9px] text-[var(--term-muted)]">Bashorat yuklanmoqda…</p>
        )}

        {(longStrategy || shortStrategy) && (
          <div className="border-t border-[var(--term-border)] pt-1">
            <p className="mb-0.5 text-[8px] font-bold uppercase text-[var(--term-gold)]">Signal darajalari</p>
            <div className="grid grid-cols-2 gap-1 font-mono-ui text-[8px]">
              {longStrategy && (
                <>
                  <span className="text-[var(--term-muted)]">Uzoq SL/TP</span>
                  <span>
                    <span className="text-red-400">${longStrategy.stopLoss}</span> /{" "}
                    <span className="text-emerald-400">${longStrategy.takeProfit}</span>
                  </span>
                </>
              )}
              {shortStrategy && (
                <>
                  <span className="text-[var(--term-muted)]">Qisqa SL/TP</span>
                  <span>
                    <span className="text-red-400">${shortStrategy.stopLoss}</span> /{" "}
                    <span className="text-emerald-400">${shortStrategy.takeProfit}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {drivers.length > 0 && (
          <div>
            <p className="mb-0.5 text-[8px] font-bold uppercase text-[var(--term-muted)]">Makro drayverlar</p>
            <div className="flex flex-wrap gap-0.5">
              {drivers.slice(0, 8).map((d) => {
                const up = d.changePercent >= 0;
                const inv = /dollar|renta/i.test(d.name);
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
