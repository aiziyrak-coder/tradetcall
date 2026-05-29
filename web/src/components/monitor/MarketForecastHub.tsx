import type { AiTradeSignal } from "../../../../shared/ai-trade-signal";
import type { MarketQuote, NewsMarketAnalysis } from "../../../../shared/types";
import { TermCard } from "./TermCard";

interface Props {
  analysis: NewsMarketAnalysis | null;
  drivers: MarketQuote[];
  aiSignal?: AiTradeSignal | null;
  calendarSourceUz?: string | null;
}

const biasStyle = {
  bullish: "text-emerald-400 border-emerald-500/50 bg-emerald-950/30",
  bearish: "text-red-400 border-red-500/50 bg-red-950/30",
  neutral: "text-amber-300 border-amber-500/50 bg-amber-950/20",
};

export function MarketForecastHub({ analysis, drivers, aiSignal, calendarSourceUz }: Props) {
  return (
    <TermCard
      title="Bozor bashorati"
      subtitle="Yangiliklar · makro · kelajak prognoz"
      accent="amber"
    >
      <div className="term-scroll min-h-0 flex-1 space-y-2 p-2">
        {aiSignal && (
          <div className="rounded border border-violet-500/40 bg-violet-950/25 px-2 py-1">
            <p className="text-[7px] font-bold uppercase text-violet-300">AI signal (oxirgi)</p>
            <p className="text-[9px] font-black text-violet-100">
              {aiSignal.action} · kirish ${aiSignal.entry.toFixed(2)} · SL ${aiSignal.stopLoss.toFixed(2)} · TP{" "}
              ${aiSignal.takeProfit.toFixed(2)}
            </p>
            <p className="text-[8px] text-slate-300">{aiSignal.triggerUz}</p>
          </div>
        )}

        {calendarSourceUz && (
          <p className="text-[7px] text-slate-500">Taqvim: {calendarSourceUz}</p>
        )}

        {analysis ? (
          <>
            <div className="flex flex-wrap items-center gap-1">
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-black ${biasStyle[analysis.overallBias]}`}
              >
                {analysis.overallBias === "bullish"
                  ? "LONG moyil"
                  : analysis.overallBias === "bearish"
                    ? "SHORT moyil"
                    : "NEYTRAL"}{" "}
                {analysis.biasStrength}%
              </span>
              <span className="text-[8px] text-[var(--term-muted)]">
                yangiliklar · ishonch {analysis.confidence}% · ↑{analysis.bullCount} ↓{analysis.bearCount}
              </span>
              {analysis.newsCandleAligned ? (
                <span className="text-[8px] font-bold text-emerald-400">✓ Yangilik + sham</span>
              ) : (
                <span className="text-[8px] font-bold text-amber-400">⚠ Mos emas</span>
              )}
            </div>

            <div className="rounded border border-[var(--term-gold)]/50 bg-amber-950/20 px-2 py-1.5">
              <p className="text-[7px] font-bold uppercase text-[var(--term-gold)]">Hukm</p>
              <p className="text-[10px] font-bold leading-snug text-amber-50">
                {analysis.tradeVerdictUz ?? analysis.recommendationUz}
              </p>
            </div>

            {(analysis.forecastUz || analysis.aiFutureOutlookUz) && (
              <div className="rounded border border-cyan-500/30 bg-cyan-950/20 px-2 py-1.5">
                <p className="text-[7px] font-bold uppercase text-cyan-300">Kelajak prognoz</p>
                {analysis.forecastUz && (
                  <p className="text-[9px] font-semibold leading-snug text-cyan-100">{analysis.forecastUz}</p>
                )}
                {analysis.aiFutureOutlookUz && (
                  <p className="mt-1 text-[8px] leading-relaxed text-slate-300">{analysis.aiFutureOutlookUz}</p>
                )}
              </div>
            )}

            {analysis.contradictionsUz && (
              <p className="rounded border border-red-500/40 bg-red-950/40 px-1.5 py-1 text-[9px] font-bold text-red-200">
                ⛔ {analysis.contradictionsUz}
              </p>
            )}

            <div>
              <p className="mb-0.5 text-[8px] font-bold uppercase text-[var(--term-muted)]">Trend</p>
              <p className="text-[8px] leading-snug text-[var(--term-text)]">{analysis.trendOutlookUz}</p>
            </div>

            {analysis.aiDiscussionUz && (
              <div>
                <p className="mb-0.5 text-[8px] font-bold uppercase text-violet-300">Chuqur muhokama</p>
                <p className="text-[8px] leading-relaxed text-slate-300">{analysis.aiDiscussionUz}</p>
              </div>
            )}

            <p className="text-[8px] leading-snug text-[var(--term-text-2)]">
              {analysis.headlineSummaryUz || analysis.narrativeUz.slice(0, 600)}
            </p>

            {analysis.futureFactors.length > 0 && (
              <div>
                <p className="mb-0.5 text-[8px] font-bold uppercase text-[var(--term-muted)]">
                  Ta&apos;sir omillari
                </p>
                {analysis.futureFactors.slice(0, 8).map((f) => (
                  <p key={f.id} className="text-[8px] text-[var(--term-text-2)]">
                    <span
                      className={
                        f.direction === "bullish"
                          ? "font-semibold text-emerald-400"
                          : f.direction === "bearish"
                            ? "font-semibold text-red-400"
                            : "text-amber-400"
                      }
                    >
                      {f.nameUz}
                    </span>
                    <span className="text-[var(--term-muted)]"> ({f.horizonUz})</span>:{" "}
                    {f.explanationUz.slice(0, 100)}
                  </p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded border border-red-900/40 bg-red-950/20 p-1">
                <p className="text-[7px] font-bold text-red-400">XAVFLAR</p>
                {analysis.risksUz.slice(0, 5).map((r, i) => (
                  <p key={i} className="text-[7px] text-red-200/90">
                    • {r.slice(0, 72)}
                  </p>
                ))}
              </div>
              <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-1">
                <p className="text-[7px] font-bold text-emerald-400">IMKONIYAT</p>
                {analysis.opportunitiesUz.slice(0, 5).map((o, i) => (
                  <p key={i} className="text-[7px] text-emerald-200/90">
                    • {o.slice(0, 72)}
                  </p>
                ))}
              </div>
            </div>

            <p className="text-[7px] text-[var(--term-muted)]">
              {analysis.candleAlignmentUz} · {new Date(analysis.updatedAt).toLocaleTimeString("uz-UZ")}
            </p>
          </>
        ) : (
          <p className="text-[9px] text-amber-400">Bashorat yuklanmoqda — yangiliklar va sham tahlili…</p>
        )}

        {drivers.length > 0 && (
          <div className="border-t border-[var(--term-border)] pt-1.5">
            <p className="mb-1 text-[8px] font-bold uppercase text-[var(--term-muted)]">Makro driverlar</p>
            <div className="flex flex-wrap gap-0.5">
              {drivers.slice(0, 12).map((d) => {
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
          </div>
        )}
      </div>
    </TermCard>
  );
}
