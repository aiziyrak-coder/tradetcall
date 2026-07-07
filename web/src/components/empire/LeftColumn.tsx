import type { AiPhase, AiTradeSignal } from "../../../../shared/ai-trade-signal";
import type { NewsMarketAnalysis } from "../../../../shared/types";
import { GlassCard } from "./GlassCard";

interface Props {
  signal: AiTradeSignal | null;
  phase: AiPhase;
  analyzing: boolean;
  sessionBusy: boolean;
  price: number;
  analysis: NewsMarketAnalysis | null;
  onRequestForecast: (mode?: "scalp" | "swing") => void;
}

function shortHint(text: string, price: number): string {
  if (!text) return "";
  const clean = text.replace(/\$?(\d{4,6}\.?\d*)/g, (match, num) => {
    const v = parseFloat(num);
    if (v > price * 1.15 || v < price * 0.85) return `$${price.toFixed(2)}`;
    return match.startsWith("$") ? match : `$${match}`;
  });
  return clean.length > 110 ? `${clean.slice(0, 107)}…` : clean;
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
    <div className="empire-col empire-col--left">
      <GlassCard className="empire-card p-3">
        {phase === "ready" && signal ? (
          <>
            {signal.modeLabelUz && (
              <div className="empire-mode-tag">
                <span className={`empire-mode-tag__badge empire-mode-tag__badge--${signal.mode ?? "swing"}`}>
                  {signal.mode === "scalp" ? "⚡" : "◷"} {signal.modeLabelUz}
                </span>
                {signal.holdTimeUz && <span className="empire-mode-tag__time">{signal.holdTimeUz}</span>}
              </div>
            )}
            <div className="empire-signal-ring">
              <div className="empire-signal-ring__outer" />
              <div className="empire-signal-ring__inner" />
              <div className="empire-signal-ring__core">
                <span className={`empire-signal-ring__action empire-signal-ring__action--${action?.toLowerCase()}`}>
                  {signal.action}
                </span>
                <span className="empire-signal-ring__sub">
                  {action === "BUY" ? "SOTIB OLISH" : action === "SELL" ? "SOTISH" : "KUTISH"}
                </span>
                <span className="empire-signal-ring__prob">~{prob}%</span>
              </div>
            </div>
            {signal.triggerUz && <p className="empire-hint">{shortHint(signal.triggerUz, price)}</p>}
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
                <div>
                  <span>MAQSAD</span>
                  <strong>${signal.takeProfit.toFixed(2)}</strong>
                </div>
              </div>
            )}
          </>
        ) : analyzing ? (
          <div className="empire-empty">
            <div className="empire-spinner" />
            <p>Tahlil…</p>
          </div>
        ) : (
          <div className="empire-empty">
            <p className="empire-empty__hint">Signal turini tanlang</p>
            <button type="button" className="empire-btn-gold" disabled={sessionBusy} onClick={() => onRequestForecast("scalp")}>
              ⚡ TEZ SAVDO
            </button>
            <button type="button" className="empire-btn-gold" disabled={sessionBusy} onClick={() => onRequestForecast("swing")}>
              ◷ UZOQ MUDDAT
            </button>
          </div>
        )}
      </GlassCard>

      <GlassCard className="empire-card p-3">
        <div className="empire-mini-row">
          <div className="flex-1">
            <p className="empire-card-title">SIGNAL KUCHI</p>
            <p className="empire-strength-val">{prob}%</p>
            <div className="empire-ind-bar">
              <div className="empire-ind-bar__fill" style={{ width: `${prob}%` }} />
            </div>
          </div>
          <div className="empire-sentiment-compact">
            <p className="empire-card-title">BOZOR</p>
            <p className="empire-sentiment-label">{macroLabel}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
