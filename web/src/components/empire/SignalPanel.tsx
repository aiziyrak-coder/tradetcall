import { motion } from "framer-motion";
import type { AiPhase, AiTradeSignal } from "../../../../shared/ai-trade-signal";
import { GlassCard } from "./GlassCard";
import { UZ } from "../../lib/uz";

interface Props {
  signal: AiTradeSignal | null;
  phase: AiPhase;
  analyzing: boolean;
  sessionBusy: boolean;
  price: number;
  onRequestForecast: () => void;
}

function shortHint(text: string, price: number): string {
  if (!text) return "";
  const clean = text.replace(/\$?(\d{4,6}\.?\d*)/g, (match, num) => {
    const v = parseFloat(num);
    if (v > price * 1.15 || v < price * 0.85) return `$${price.toFixed(2)}`;
    return match.startsWith("$") ? match : `$${match}`;
  });
  return clean.length > 160 ? `${clean.slice(0, 157)}…` : clean;
}

export function SignalPanel({
  signal,
  phase,
  analyzing,
  sessionBusy,
  price,
  onRequestForecast,
}: Props) {
  const action = signal?.action;
  const prob = signal?.winProbability ?? signal?.confidence ?? 0;
  const actionClass =
    action === "BUY" ? "text-[#ffe88b]" : action === "SELL" ? "text-[#ff8a50]" : "empire-glow-text";

  return (
    <GlassCard className="flex h-full min-h-0 flex-col p-4" float>
      {phase === "ready" && signal ? (
        <>
          <motion.div
            className="relative mx-auto mb-3 flex h-[140px] w-[140px] items-center justify-center"
          >
            <div className="absolute inset-4 rounded-full border border-[rgba(255,213,74,0.2)]" />
            <div className="relative z-10 text-center">
              <p className={`font-['Syncopate'] text-3xl font-bold leading-none ${actionClass}`}>
                {signal.action}
              </p>
              <p className="mt-1 text-[8px] tracking-[0.25em] text-[rgba(255,232,139,0.45)]">
                {action === "BUY" ? "SOTIB OLISH" : action === "SELL" ? "SOTISH" : "KUTISH"}
              </p>
              <p className="mt-2 font-['JetBrains_Mono'] text-xs text-[#ffd54a]">~{prob}% ehtimol</p>
            </div>
          </motion.div>

          {signal.triggerUz && (
            <p className="mb-3 text-[10px] leading-relaxed text-[rgba(255,232,139,0.55)]">
              {shortHint(signal.triggerUz, price)}
            </p>
          )}

          {signal.action !== "HOLD" && (
            <div className="mb-3 grid grid-cols-3 gap-1.5 text-center text-[9px]">
              <div className="border border-[rgba(255,107,74,0.25)] p-1.5" style={{ borderRadius: "4px" }}>
                <span className="text-[rgba(255,232,139,0.4)]">STOP</span>
                <p className="font-['JetBrains_Mono'] text-[#ff8a50]">${signal.stopLoss.toFixed(2)}</p>
              </div>
              <div className="border border-[rgba(255,213,74,0.25)] p-1.5" style={{ borderRadius: "4px" }}>
                <span className="text-[rgba(255,232,139,0.4)]">KIRISH</span>
                <p className="font-['JetBrains_Mono'] text-[#ffd54a]">${signal.entry.toFixed(2)}</p>
              </div>
              <div className="border border-[rgba(255,213,74,0.35)] p-1.5" style={{ borderRadius: "4px" }}>
                <span className="text-[rgba(255,232,139,0.4)]">MAQSAD</span>
                <p className="font-['JetBrains_Mono'] text-[#ffe88b]">${signal.takeProfit.toFixed(2)}</p>
              </div>
            </div>
          )}
        </>
      ) : analyzing ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[rgba(255,213,74,0.15)] border-t-[#ffd54a]" />
          <p className="text-[10px] tracking-widest text-[rgba(255,232,139,0.5)]">8 TREYDER TAHLILI</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <p className="font-['Syncopate'] text-2xl opacity-30">—</p>
          <p className="text-[10px] text-[rgba(255,232,139,0.45)]">Prognoz uchun tugma</p>
          <button type="button" className="empire-btn-gold" disabled={sessionBusy} onClick={onRequestForecast}>
            ▶ {UZ.monitorForecast}
          </button>
        </div>
      )}
      <div className="empire-landscape" />
    </GlassCard>
  );
}
