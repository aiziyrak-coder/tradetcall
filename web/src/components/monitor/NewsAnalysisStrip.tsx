import type { NewsMarketAnalysis } from "../../../../shared/types";

interface Props {
  analysis: NewsMarketAnalysis | null;
  analyzing: boolean;
  hasApiKey: boolean;
  onDeepAnalysis: () => void;
}

const biasStyle = {
  bullish: "text-emerald-400 bg-emerald-950/50 border-emerald-500/40",
  bearish: "text-red-400 bg-red-950/50 border-red-500/40",
  neutral: "text-amber-300 bg-amber-950/40 border-amber-500/40",
};

export function NewsAnalysisStrip({ analysis, analyzing, hasApiKey, onDeepAnalysis }: Props) {
  if (!analysis) {
    return (
      <div className="flex h-full items-center justify-center text-[9px] text-[var(--term-muted)]">
        Tahlil yuklanmoqda…
      </div>
    );
  }

  const outlook =
    analysis.tradeVerdictUz ||
    analysis.recommendationUz ||
    analysis.trendOutlookUz?.slice(0, 140);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden px-2 py-1">
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <span className="text-[8px] font-bold uppercase text-cyan-400">Bashorat</span>
        <span className={`rounded border px-1.5 py-0 text-[8px] font-black ${biasStyle[analysis.overallBias]}`}>
          {analysis.overallBias.toUpperCase()} {analysis.biasStrength}%
        </span>
        <span className="text-[8px] text-[var(--term-muted)]">
          B{analysis.bullCount}/S{analysis.bearCount} · {analysis.confidence}%
        </span>
        {analysis.newsCandleAligned ? (
          <span className="text-[8px] font-bold text-emerald-400">✓ MOS</span>
        ) : (
          <span className="text-[8px] font-bold text-amber-400">✗ MOS</span>
        )}
        <button
          type="button"
          onClick={onDeepAnalysis}
          disabled={analyzing || !hasApiKey}
          className="ml-auto rounded bg-cyan-800/80 px-2 py-0.5 text-[8px] font-bold disabled:opacity-40"
        >
          {analyzing ? "AI…" : "AI+"}
        </button>
      </div>
      <p className="line-clamp-2 shrink-0 text-[9px] leading-snug text-[var(--term-text)]">{outlook}</p>
      {analysis.forecastUz && (
        <p className="line-clamp-1 shrink-0 text-[8px] font-semibold text-amber-300">{analysis.forecastUz}</p>
      )}
      {analysis.contradictionsUz && (
        <p className="line-clamp-1 shrink-0 text-[8px] text-red-400">{analysis.contradictionsUz}</p>
      )}
      {analysis.aiDiscussionUz && (
        <p className="line-clamp-1 shrink-0 text-[8px] text-cyan-200/90">{analysis.aiDiscussionUz}</p>
      )}
    </div>
  );
}
