import type { NewsMarketAnalysis } from "../../../../shared/types";
import { UZ } from "../../lib/uz";

interface Props {
  analysis: NewsMarketAnalysis | null;
  analyzing: boolean;
  hasApiKey: boolean;
  onDeepAnalysis: () => void;
}

const biasColors = {
  bullish: "text-emerald-400 border-emerald-500/50 bg-emerald-950/40",
  bearish: "text-red-400 border-red-500/50 bg-red-950/40",
  neutral: "text-amber-300 border-amber-500/50 bg-amber-950/40",
};

const biasUz = {
  bullish: "OLTIN UCHUN IJOBIY",
  bearish: "OLTIN UCHUN SALBIY",
  neutral: "NEYTRAL / ARALASH",
};

export function NewsAnalysisPanel({
  analysis,
  analyzing,
  hasApiKey,
  onDeepAnalysis,
}: Props) {
  if (!analysis) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-[var(--term-border)] bg-[var(--term-panel)] p-4 text-[12px] text-[var(--term-muted)]">
        Yangiliklar tahlili yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-cyan-500/30 bg-[var(--term-panel)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--term-border)] bg-[var(--term-panel-2)] px-3 py-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
          {UZ.newsAnalysis.title}
        </h2>
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${biasColors[analysis.overallBias]}`}
        >
          {biasUz[analysis.overallBias]} · {analysis.biasStrength}%
        </span>
        <span className="text-[10px] text-[var(--term-muted)]">
          Bull {analysis.bullCount} / Bear {analysis.bearCount} · ishonch {analysis.confidence}%
        </span>
        {analysis.newsCandleAligned ? (
          <span className="rounded bg-emerald-800/60 px-2 py-0.5 text-[9px] font-bold text-emerald-200">
            Yangilik + shamlar MOS
          </span>
        ) : (
          <span className="rounded bg-amber-800/60 px-2 py-0.5 text-[9px] font-bold text-amber-200">
            To'liq mos emas
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onDeepAnalysis}
          disabled={analyzing || !hasApiKey}
          className="term-btn-cyan rounded px-3 py-1 text-[10px] disabled:opacity-50"
        >
          {analyzing ? "AI muhokama…" : UZ.newsAnalysis.aiBtn}
        </button>
      </div>

      <div className="term-scroll min-h-0 flex-1 p-3">
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--term-border)] bg-black/25 p-3">
            <p className="text-[10px] font-bold uppercase text-[var(--term-gold)]">
              {UZ.newsAnalysis.discussion}
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--term-text)]">
              {analysis.narrativeUz}
            </p>
            {analysis.aiDiscussionUz && (
              <p className="mt-2 border-t border-cyan-500/20 pt-2 text-[12px] leading-relaxed text-cyan-100/90">
                <span className="font-bold text-cyan-400">AI muhokama: </span>
                {analysis.aiDiscussionUz}
              </p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--term-border)] p-2.5">
              <p className="text-[10px] font-bold text-[var(--term-cyan)]">{UZ.newsAnalysis.trend}</p>
              <p className="mt-1 text-[11px] text-[var(--term-text-2)]">{analysis.trendOutlookUz}</p>
            </div>
            <div className="rounded-lg border border-[var(--term-border)] p-2.5">
              <p className="text-[10px] font-bold text-[var(--term-cyan)]">{UZ.newsAnalysis.candles}</p>
              <p className="mt-1 text-[11px] text-[var(--term-text-2)]">{analysis.candleAlignmentUz}</p>
            </div>
          </div>

          {analysis.aiFutureOutlookUz && (
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-2.5">
              <p className="text-[10px] font-bold text-emerald-400">{UZ.newsAnalysis.future}</p>
              <p className="mt-1 text-[11px] leading-relaxed">{analysis.aiFutureOutlookUz}</p>
            </div>
          )}

          <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-2.5 text-[12px] font-semibold text-amber-100">
            {analysis.recommendationUz}
          </p>

          {analysis.contradictionsUz && (
            <p className="rounded-lg border border-red-500/50 bg-red-950/40 p-2.5 text-[11px] font-bold text-red-300">
              ⚠ {analysis.contradictionsUz}
            </p>
          )}

          {analysis.futureFactors.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase text-[var(--term-gold)]">
                {UZ.newsAnalysis.factors}
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {analysis.futureFactors.map((f) => (
                  <div
                    key={f.id}
                    className="rounded border border-[var(--term-border)] bg-[var(--term-bg)] p-2"
                  >
                    <div className="flex justify-between gap-1">
                      <span className="text-[11px] font-semibold">{f.nameUz}</span>
                      <span
                        className={`text-[9px] font-bold uppercase ${
                          f.direction === "bullish"
                            ? "text-emerald-400"
                            : f.direction === "bearish"
                              ? "text-red-400"
                              : "text-zinc-400"
                        }`}
                      >
                        {f.direction}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[var(--term-muted)]">{f.horizonUz}</p>
                    <p className="mt-1 text-[10px] leading-snug text-[var(--term-text-2)]">
                      {f.explanationUz}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[10px] font-bold text-red-400">{UZ.newsAnalysis.risks}</p>
              <ul className="space-y-1">
                {analysis.risksUz.map((r, i) => (
                  <li key={i} className="text-[10px] text-[var(--term-text-2)]">
                    · {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold text-emerald-400">{UZ.newsAnalysis.opportunities}</p>
              <ul className="space-y-1">
                {analysis.opportunitiesUz.map((o, i) => (
                  <li key={i} className="text-[10px] text-[var(--term-text-2)]">
                    · {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-bold text-[var(--term-muted)]">
              {UZ.newsAnalysis.headlines} ({analysis.itemInsights.length})
            </p>
            <div className="max-h-[140px] space-y-1 overflow-y-auto term-scroll rounded border border-[var(--term-border)]/50 p-1">
              {analysis.itemInsights.slice(0, 12).map((item) => (
                <div
                  key={item.newsId}
                  className="rounded bg-black/20 px-2 py-1 text-[10px]"
                >
                  <div className="flex gap-2">
                    <span
                      className={`shrink-0 font-bold uppercase ${
                        item.sentiment === "bullish"
                          ? "text-emerald-400"
                          : item.sentiment === "bearish"
                            ? "text-red-400"
                            : "text-zinc-500"
                      }`}
                    >
                      {item.sentiment === "bullish" ? "+" : item.sentiment === "bearish" ? "−" : "○"}
                    </span>
                    <span className="line-clamp-1 font-medium text-[var(--term-text)]">
                      {item.titleUz}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-5 text-[9px] text-[var(--term-muted)]">{item.impactUz}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
