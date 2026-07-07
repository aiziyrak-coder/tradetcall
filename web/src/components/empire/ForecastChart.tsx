import { motion } from "framer-motion";
import type { AiTradeSignal } from "../../../../shared/ai-trade-signal";

interface Props {
  signal: AiTradeSignal | null;
  price: number;
}

function buildLevels(signal: AiTradeSignal) {
  const isScalp = signal.mode === "scalp";
  const move = Math.abs(signal.takeProfit - signal.entry) || (isScalp ? 2.5 : 8);

  if (isScalp) {
    return [
      { label: "TP", val: signal.takeProfit, kind: "tp" as const },
      { label: "SL", val: signal.stopLoss, kind: "sl" as const },
    ];
  }

  const levels = [
    { label: "TP1", val: signal.takeProfit, kind: "tp" as const },
    { label: "SL", val: signal.stopLoss, kind: "sl" as const },
  ];
  if (signal.forecastHigh && signal.action === "BUY") {
    levels.unshift({ label: "TP3", val: signal.forecastHigh + move * 0.4, kind: "tp" as const });
    levels.unshift({ label: "TP2", val: signal.forecastHigh, kind: "tp" as const });
  } else if (signal.forecastLow && signal.action === "SELL") {
    levels.unshift({ label: "TP3", val: signal.forecastLow - move * 0.4, kind: "tp" as const });
    levels.unshift({ label: "TP2", val: signal.forecastLow, kind: "tp" as const });
  }
  return levels;
}

export function ForecastChart({ signal, price }: Props) {
  const idle = !signal || signal.action === "HOLD" || !price;

  if (idle) {
    return (
      <div className="empire-forecast-wrap">
        <div className="empire-forecast-chart">
          <svg viewBox="0 0 160 70" preserveAspectRatio="none">
            <defs>
              <linearGradient id="emp-fg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(201,160,32,0.2)" />
                <stop offset="50%" stopColor="#c9a020" />
                <stop offset="100%" stopColor="rgba(201,160,32,0.2)" />
              </linearGradient>
            </defs>
            <motion.path
              d="M0,50 Q40,25 80,38 T160,28"
              fill="none"
              stroke="url(#emp-fg)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5 }}
            />
          </svg>
        </div>
        <div className="empire-forecast-labels">
          <span className="tp">TP1 —</span>
          <span className="tp">TP2 —</span>
          <span className="sl">SL —</span>
        </div>
      </div>
    );
  }

  const levels = buildLevels(signal);
  const vals = [...levels.map((l) => l.val), price, signal.entry];
  const min = Math.min(...vals) - 2;
  const max = Math.max(...vals) + 2;
  const range = max - min || 1;
  const y = (v: number) => 58 - ((v - min) / range) * 48;

  const pts = [signal.stopLoss, signal.entry, signal.takeProfit];
  const d = pts.map((v, i) => `${(i / (pts.length - 1)) * 140 + 8},${y(v)}`).join(" L ");

  return (
    <div className="empire-forecast-wrap">
      {signal.mode && (
        <p className="empire-forecast-mode">
          {signal.mode === "scalp" ? "⚡ Tor target (5–20 daq)" : "◷ Keng target (4–24 soat)"}
        </p>
      )}
      <div className="empire-forecast-chart">
        <svg viewBox="0 0 160 70" preserveAspectRatio="none">
          <defs>
            <linearGradient id="emp-fg2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a08018" />
              <stop offset="100%" stopColor="#e8c84a" />
            </linearGradient>
          </defs>
          {levels.map((l) => (
            <line
              key={l.label}
              x1="4"
              y1={y(l.val)}
              x2="156"
              y2={y(l.val)}
              stroke={l.kind === "sl" ? "#d45448" : "#c9a020"}
              strokeWidth="0.4"
              strokeDasharray="2 2"
              opacity="0.45"
            />
          ))}
          <motion.path
            d={`M ${d}`}
            fill="none"
            stroke="url(#emp-fg2)"
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2 }}
          />
        </svg>
      </div>
      <div className="empire-forecast-labels">
        {levels.map((l) => (
          <span key={l.label} className={l.kind}>
            {l.label} ${l.val.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}
