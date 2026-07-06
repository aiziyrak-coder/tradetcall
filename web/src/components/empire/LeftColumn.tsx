import { motion } from "framer-motion";
import type { AiPhase, AiTradeSignal } from "../../../../shared/ai-trade-signal";
import type { NewsMarketAnalysis } from "../../../../shared/types";
import { GlassCard } from "./GlassCard";
import { UZ } from "../../lib/uz";

interface Props {
  signal: AiTradeSignal | null;
  phase: AiPhase;
  analyzing: boolean;
  sessionBusy: boolean;
  price: number;
  analysis: NewsMarketAnalysis | null;
  onRequestForecast: () => void;
}

function shortHint(text: string, price: number): string {
  if (!text) return "";
  const clean = text.replace(/\$?(\d{4,6}\.?\d*)/g, (match, num) => {
    const v = parseFloat(num);
    if (v > price * 1.15 || v < price * 0.85) return `$${price.toFixed(2)}`;
    return match.startsWith("$") ? match : `$${match}`;
  });
  return clean.length > 130 ? `${clean.slice(0, 127)}…` : clean;
}

export function LeftColumn({
  signal,
  phase,
  analyzing,
  sessionBusy,
  price,
  analysis,
  onRequestForecast,
}: Props) {
  const prob = signal?.winProbability ?? signal?.confidence ?? 0;
  const action = signal?.action;
  const macro = analysis?.overallBias;
  const macroLabel =
    macro === "bullish" ? "Bullish" : macro === "bearish" ? "Bearish" : "Neytral";

  return (
    <div className="empire-col flex h-full min-h-0 flex-col gap-2">
      <GlassCard className="empire-card empire-card--signal p-3" float>
        {phase === "ready" && signal ? (
          <>
            <div className="empire-signal-ring mx-auto mb-2">
              <div className="empire-signal-ring__outer" />
              <div className="empire-signal-ring__inner" />
              <div className="empire-signal-ring__core">
                <span className={`empire-signal-ring__action empire-signal-ring__action--${action?.toLowerCase()}`}>
                  {signal.action}
                </span>
                <span className="empire-signal-ring__sub">
                  {action === "BUY" ? "SOTIB OLISH" : action === "SELL" ? "SOTISH" : "KUTISH"}
                </span>
                <span className="empire-signal-ring__prob">~{prob}% ehtimol</span>
              </div>
            </div>
            {signal.triggerUz && (
              <p className="empire-hint">{shortHint(signal.triggerUz, price)}</p>
            )}
            {action !== "HOLD" && (
              <div className="empire-levels">
                <div className="empire-levels__sl">
                  <span>STOP</span>
                  <strong>${signal.stopLoss.toFixed(2)}</strong>
                </div>
                <div>
                  <span>KIRISH</span>
                  <strong>${signal.entry.toFixed(2)}</strong>
                </div>
                <div className="empire-levels__tp">
                  <span>MAQSAD</span>
                  <strong>${signal.takeProfit.toFixed(2)}</strong>
                </div>
              </div>
            )}
          </>
        ) : analyzing ? (
          <div className="empire-empty">
            <div className="empire-spinner" />
            <p>8 treyder tahlili</p>
          </div>
        ) : (
          <div className="empire-empty">
            <p className="opacity-40">—</p>
            <p>Prognoz uchun tugma</p>
            <button type="button" className="empire-btn-gold" disabled={sessionBusy} onClick={onRequestForecast}>
              ▶ {UZ.monitorForecast}
            </button>
          </div>
        )}
      </GlassCard>

      <GlassCard className="empire-card p-3" float>
        <p className="empire-card-title">SIGNAL KUCHI</p>
        <p className="empire-strength-val">{prob}%</p>
        <svg className="empire-strength-chart" viewBox="0 0 200 40" preserveAspectRatio="none">
          <defs>
            <linearGradient id="str-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c9a020" />
              <stop offset="100%" stopColor="#ffe88b" />
            </linearGradient>
            <filter id="str-glow">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
          </defs>
          <motion.path
            d={`M0,32 Q40,${34 - prob * 0.2} 90,${28 - prob * 0.15} T200,${18 - prob * 0.12}`}
            fill="none"
            stroke="url(#str-line)"
            strokeWidth="2.5"
            filter="url(#str-glow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2 }}
          />
        </svg>
      </GlassCard>

      <GlassCard className="empire-card empire-card--sentiment p-3" float>
        <p className="empire-card-title">BOZOR HOLATI</p>
        <div className={`empire-sentiment-icon empire-sentiment-icon--${macro ?? "neutral"}`}>
          {macro === "bullish" ? "🐂" : macro === "bearish" ? "🐻" : "⚖"}
        </div>
        <p className={`empire-sentiment-label empire-sentiment-label--${macro ?? "neutral"}`}>
          {macroLabel}
        </p>
      </GlassCard>
    </div>
  );
}
