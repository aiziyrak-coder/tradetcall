import { motion } from "framer-motion";
import type { AiTradeSignal } from "../../../../shared/ai-trade-signal";

interface Props {
  signal: AiTradeSignal | null;
  price: number;
}

export function ForecastChart({ signal, price }: Props) {
  if (!signal || signal.action === "HOLD" || !price) {
    return (
      <div className="h-[60px] w-full">
        <svg viewBox="0 0 200 60" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="emp-fg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,184,0,0.2)" />
              <stop offset="50%" stopColor="#ffd54a" />
              <stop offset="100%" stopColor="rgba(255,184,0,0.2)" />
            </linearGradient>
            <filter id="emp-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <motion.path
            d="M0,45 Q40,20 80,35 T160,25 T200,30"
            fill="none"
            stroke="url(#emp-fg)"
            strokeWidth="2"
            filter="url(#emp-glow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
      </div>
    );
  }

  const levels = [
    { label: "SL", val: signal.stopLoss, color: "#ff6b4a" },
    { label: "Kirish", val: signal.entry, color: "#ffd54a" },
    { label: "TP", val: signal.takeProfit, color: "#ffe88b" },
  ];
  if (signal.forecastHigh) levels.push({ label: "TP2", val: signal.forecastHigh, color: "#ffb800" });

  const vals = [...levels.map((l) => l.val), price];
  const min = Math.min(...vals) - 3;
  const max = Math.max(...vals) + 3;
  const range = max - min || 1;
  const y = (v: number) => 52 - ((v - min) / range) * 42;

  const pts = [price, signal.entry, signal.takeProfit];
  const d = pts.map((v, i) => `${(i / (pts.length - 1)) * 180 + 10},${y(v)}`).join(" L ");

  return (
    <div className="h-[60px] w-full">
      <svg viewBox="0 0 200 60" className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="emp-fg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c9a020" />
            <stop offset="100%" stopColor="#ffe88b" />
          </linearGradient>
          <filter id="emp-glow2">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {levels.map((l) => (
          <g key={l.label + l.val}>
            <line x1="8" y1={y(l.val)} x2="192" y2={y(l.val)} stroke={l.color} strokeWidth="0.4" strokeDasharray="2 2" opacity="0.5" />
            <text x="4" y={y(l.val) - 1} fill={l.color} fontSize="5" fontFamily="monospace">
              {l.label}
            </text>
          </g>
        ))}
        <motion.path
          d={`M ${d}`}
          fill="none"
          stroke="url(#emp-fg2)"
          strokeWidth="2"
          filter="url(#emp-glow2)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2 }}
        />
      </svg>
    </div>
  );
}
