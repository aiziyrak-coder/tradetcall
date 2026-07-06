import type { AiTradeAction } from "../../../../shared/ai-trade-signal";

interface Props {
  action: AiTradeAction;
  winProbability?: number;
  grade?: string;
  confluencePct?: number;
  confidence: number;
}

const gradeGlow: Record<string, string> = {
  "A+": "signal-core--aplus",
  A: "signal-core--a",
  B: "signal-core--b",
  C: "signal-core--c",
  D: "signal-core--d",
};

export function SignalCore({ action, winProbability, grade, confluencePct, confidence }: Props) {
  const wp = winProbability ?? confidence;
  const pct = Math.min(100, Math.max(0, wp));
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const glow = grade ? (gradeGlow[grade] ?? "signal-core--c") : "signal-core--b";
  const actionHue =
    action === "BUY" ? "signal-core--buy" : action === "SELL" ? "signal-core--sell" : "signal-core--hold";

  return (
    <div className={`signal-core ${glow} ${actionHue} relative mx-auto flex w-full max-w-[200px] flex-col items-center py-2`}>
      <svg viewBox="0 0 100 100" className="h-[100px] w-[100px] -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="signal-core-ring transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
        <span className="text-[18px] font-black leading-none text-[var(--term-gold)]">{Math.round(pct)}%</span>
        <span className="text-[7px] font-bold uppercase tracking-wider text-[var(--term-muted)]">yutish</span>
        {grade && (
          <span className="mt-0.5 rounded border border-current/30 px-1.5 py-px text-[9px] font-black">
            {grade}
          </span>
        )}
      </div>
      {confluencePct != null && (
        <div className="signal-core-pulse mt-1 flex gap-2 text-[7px] font-bold text-[var(--term-muted)]">
          <span>Moslik {confluencePct}%</span>
          <span>·</span>
          <span>Ishonch {confidence}%</span>
        </div>
      )}
    </div>
  );
}
