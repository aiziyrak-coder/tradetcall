/** Kinematografik signal displey — aniq va dramatik */
import type { AiTradeAction } from "../../../../shared/ai-trade-signal";

interface Props {
  action: AiTradeAction;
  winProbability?: number;
  grade?: string;
  longScore?: number;
  shortScore?: number;
}

export function CinematicSignal({ action, winProbability, grade, longScore, shortScore }: Props) {
  const wp = winProbability ?? 0;
  const isBuy = action === "BUY";
  const isSell = action === "SELL";
  const isHold = action === "HOLD";

  const shellClass = isBuy
    ? "cine-signal cine-signal--buy"
    : isSell
      ? "cine-signal cine-signal--sell"
      : "cine-signal cine-signal--hold";

  const label = isBuy ? "SOTIB OLISH" : isSell ? "SOTISH" : "KUTISH";

  return (
    <div className={shellClass}>
      <div className="cine-signal__ring cine-signal__ring--outer" />
      <div className="cine-signal__ring cine-signal__ring--inner" />
      <div className="cine-signal__core">
        <span className="cine-signal__action font-cine">{action}</span>
        <span className="cine-signal__label">{label}</span>
        {!isHold && wp > 0 && (
          <span className="cine-signal__prob font-mono-ui">~{wp}% yutish</span>
        )}
        {grade && grade !== "WAIT" && <span className="cine-signal__grade">{grade}</span>}
      </div>
      {(longScore != null || shortScore != null) && (
        <div className="cine-signal__panel font-mono-ui">
          <span className={isBuy ? "text-emerald-400" : ""}>L{longScore ?? 0}</span>
          <span className="text-slate-600">/</span>
          <span className={isSell ? "text-red-400" : ""}>S{shortScore ?? 0}</span>
        </div>
      )}
    </div>
  );
}
