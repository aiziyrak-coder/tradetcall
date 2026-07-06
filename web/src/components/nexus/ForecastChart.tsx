import type { AiTradeSignal } from "../../../../shared/ai-trade-signal";

interface Props {
  signal: AiTradeSignal | null;
  price: number;
}

/** Mini prognoz chizig'i — kirish, TP, SL */
export function ForecastChart({ signal, price }: Props) {
  if (!signal || signal.action === "HOLD" || !price) {
    return (
      <div className="nx-forecast nx-forecast--empty">
        <svg viewBox="0 0 200 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id="nx-fg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,213,79,0.1)" />
              <stop offset="50%" stopColor="rgba(255,213,79,0.5)" />
              <stop offset="100%" stopColor="rgba(255,213,79,0.2)" />
            </linearGradient>
          </defs>
          <path
            d="M0,50 Q50,30 100,45 T200,35"
            fill="none"
            stroke="url(#nx-fg)"
            strokeWidth="2"
            className="nx-forecast-line"
          />
        </svg>
      </div>
    );
  }

  const levels = [
    { label: "SL", val: signal.stopLoss, color: "#ff6b6b" },
    { label: "Kirish", val: signal.entry, color: "#ffd54f" },
    { label: "TP", val: signal.takeProfit, color: "#3dd68c" },
  ];
  if (signal.forecastHigh) levels.push({ label: "TP2", val: signal.forecastHigh, color: "#7bed9f" });
  if (signal.forecastLow && signal.action === "SELL")
    levels.push({ label: "TP2", val: signal.forecastLow, color: "#7bed9f" });

  const vals = levels.map((l) => l.val);
  const min = Math.min(...vals, price) - 2;
  const max = Math.max(...vals, price) + 2;
  const range = max - min || 1;
  const y = (v: number) => 70 - ((v - min) / range) * 55;

  const pathPts = [price, signal.entry, signal.takeProfit];
  const pathD = pathPts
    .map((v, i) => `${(i / (pathPts.length - 1)) * 180 + 10},${y(v)}`)
    .join(" L ");

  return (
    <div className="nx-forecast">
      <svg viewBox="0 0 200 80" preserveAspectRatio="none">
        <defs>
          <linearGradient id="nx-fg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#ffe082" />
          </linearGradient>
        </defs>
        <path d={`M ${pathD}`} fill="none" stroke="url(#nx-fg2)" strokeWidth="2.5" className="nx-forecast-line" />
        {levels.map((l) => (
          <g key={l.label + l.val}>
            <line x1="8" y1={y(l.val)} x2="192" y2={y(l.val)} stroke={l.color} strokeWidth="0.5" strokeDasharray="3 3" opacity="0.6" />
            <text x="4" y={y(l.val) - 2} fill={l.color} fontSize="7" fontFamily="monospace">
              {l.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
