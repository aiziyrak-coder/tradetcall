import { motion } from "framer-motion";
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
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-[8px] tracking-[0.12em] text-[rgba(255,232,139,0.45)]">
        <span>{label}</span>
        <span className="font-['JetBrains_Mono'] text-[#ffe88b]">{value}</span>
      </div>
      <div className="empire-ind-bar">
        <motion.div
          className="empire-ind-bar__fill"
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
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
    bias === "bullish" ? `LONG ${analysis?.biasStrength ?? 0}%` : bias === "bearish" ? `SHORT ${analysis?.biasStrength ?? 0}%` : `NEYTRAL ${analysis?.biasStrength ?? 0}%`;

  const trendW =
    tech?.trend === "bullish" ? 78 : tech?.trend === "bearish" ? 22 : 50;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <GlassCard className="p-3" float>
        <div className="flex gap-2">
          <span className="text-lg">🚀</span>
          <div>
            <p className="font-['Syncopate'] text-[11px] font-bold text-[#ffd54a]">{biasLabel}</p>
            {analysis?.tradeVerdictUz && (
              <p className="mt-1 text-[9px] leading-snug text-[rgba(255,232,139,0.5)]">
                {analysis.tradeVerdictUz}
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="flex-1 p-3" float>
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
      </GlassCard>

      <GlassCard className="p-3 text-center" float>
        <p className="mb-2 text-[8px] tracking-[0.14em] text-[rgba(255,232,139,0.45)]">UMUMIY ISHONCH</p>
        <div
          className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={
            {
              background: `conic-gradient(#ffd54a ${prob}%, rgba(255,213,74,0.08) 0)`,
            } as CSSProperties
          }
        >
          <div
            className="absolute inset-1 flex items-center justify-center rounded-full"
            style={{ background: "rgba(8,8,8,0.95)" }}
          >
            <span className="font-['JetBrains_Mono'] text-sm font-semibold text-[#ffe88b]">{prob}%</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-3" float>
        <p className="mb-2 text-[8px] tracking-[0.14em] text-[#ffd54a]">PROGNOZ</p>
        <ForecastChart signal={signal} price={data?.gold?.price ?? 0} />
      </GlassCard>
    </div>
  );
}
