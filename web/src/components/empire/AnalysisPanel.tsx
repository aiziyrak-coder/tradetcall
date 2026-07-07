import type { CSSProperties } from "react";
import type { AiTradeSignal } from "../../../../shared/ai-trade-signal";
import type { MonitorSnapshot } from "../../../../shared/types";
import { GlassCard } from "./GlassCard";
import { ForecastChart } from "./ForecastChart";

interface Props {
  data: MonitorSnapshot | null;
  signal: AiTradeSignal | null;
}

function IndBar({ label, value, width }: { label: string; value: string; width: number }) {
  return (
    <div className="empire-ind">
      <div className="empire-ind__head">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="empire-ind-bar">
        <div className="empire-ind-bar__fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function AnalysisPanel({ data, signal }: Props) {
  const tech = data?.marketTechnical;
  const analysis = data?.newsAnalysis;
  const prob = signal?.winProbability ?? signal?.confidence ?? 0;
  const bias = analysis?.overallBias;
  const biasLabel =
    bias === "bullish"
      ? `LONG ${analysis?.biasStrength ?? 0}%`
      : bias === "bearish"
        ? `SHORT ${analysis?.biasStrength ?? 0}%`
        : `NEYTRAL ${analysis?.biasStrength ?? 0}%`;
  const trendW = tech?.trend === "bullish" ? 78 : tech?.trend === "bearish" ? 22 : 50;

  return (
    <div className="empire-col flex h-full min-h-0 flex-col gap-2">
      <GlassCard className="empire-card empire-card--analysis p-3">
        <p className="empire-verdict-title">{biasLabel}</p>
        {analysis?.tradeVerdictUz && (
          <p className="empire-verdict-text">{analysis.tradeVerdictUz}</p>
        )}

        <div className="mt-2 flex gap-3">
          <div className="min-w-0 flex-1">
            {tech && (
              <>
                <IndBar
                  label="TREND"
                  value={tech.trend === "bullish" ? "YUQORI" : tech.trend === "bearish" ? "PAST" : "NEYTRAL"}
                  width={trendW}
                />
                <IndBar label="ADX KUCH" value={String(tech.adx)} width={Math.min(100, tech.adx)} />
                <IndBar label="RSI" value={String(tech.rsi)} width={tech.rsi} />
              </>
            )}
            {data?.setupQuality && (
              <IndBar label="SETUP" value={`${data.setupQuality.score}/100`} width={data.setupQuality.score} />
            )}
          </div>

          <div className="empire-conf-block shrink-0">
            <p className="empire-card-title mb-1 text-center">UMUMIY ISHONCH</p>
            <div
              className="empire-conf-ring"
              style={{ "--empire-conf": `${prob}%` } as CSSProperties}
            >
              <span>{prob}%</span>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="empire-card empire-card--forecast empire-card--grow p-3">
        <p className="empire-card-title mb-2">PROGNOZ</p>
        <ForecastChart signal={signal} price={data?.gold?.price ?? 0} />
      </GlassCard>
    </div>
  );
}
