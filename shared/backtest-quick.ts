import type { Candle } from "./types";
import { analyzeTechnicals } from "./technical";

export interface QuickBacktestResult {
  horizon: "short" | "long";
  samples: number;
  wins: number;
  losses: number;
  winRatePct: number;
  avgRR: number;
  noteUz: string;
}

function tfBiasFromTech(tech: ReturnType<typeof analyzeTechnicals>): "long" | "short" | "neutral" {
  if (tech.trend === "bullish" && tech.rsi < 72) return "long";
  if (tech.trend === "bearish" && tech.rsi > 28) return "short";
  return "neutral";
}

/** So'nggi shamlarda oddiy TF qoidasi backtest (taxminiy) */
export function runQuickBacktest(
  candles: Candle[],
  horizon: "short" | "long"
): QuickBacktestResult {
  const minBars = horizon === "short" ? 40 : 60;
  if (candles.length < minBars + 5) {
    return {
      horizon,
      samples: 0,
      wins: 0,
      losses: 0,
      winRatePct: 0,
      avgRR: 0,
      noteUz: "Backtest uchun yetarli shamlar yo'q",
    };
  }

  const lookback = horizon === "short" ? 1.2 : 2.0;
  let wins = 0;
  let losses = 0;
  let rrSum = 0;
  let samples = 0;

  const start = Math.max(20, candles.length - (horizon === "short" ? 80 : 120));

  for (let i = start; i < candles.length - 3; i++) {
    const slice = candles.slice(0, i + 1);
    const tech = analyzeTechnicals(slice);
    const bias = tfBiasFromTech(tech);
    if (bias === "neutral") continue;

    const entry = candles[i].close;
    const atr = tech.atr || entry * 0.001;
    const sl = bias === "long" ? entry - atr * 1.05 : entry + atr * 1.05;
    const tp = bias === "long" ? entry + atr * lookback : entry - atr * lookback;
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk <= 0) continue;

    let outcome: "win" | "loss" | null = null;
    for (let j = i + 1; j < Math.min(i + 12, candles.length); j++) {
      const h = candles[j].high;
      const l = candles[j].low;
      if (bias === "long") {
        if (l <= sl) {
          outcome = "loss";
          break;
        }
        if (h >= tp) {
          outcome = "win";
          break;
        }
      } else {
        if (h >= sl) {
          outcome = "loss";
          break;
        }
        if (l <= tp) {
          outcome = "win";
          break;
        }
      }
    }
    if (!outcome) continue;

    samples += 1;
    if (outcome === "win") wins += 1;
    else losses += 1;
    rrSum += reward / risk;
  }

  const winRatePct = samples > 0 ? Math.round((wins / samples) * 100) : 0;
  const avgRR = samples > 0 ? Math.round((rrSum / samples) * 100) / 100 : 0;

  const noteUz =
    samples < 8
      ? "Namuna kam — faqat yo'nalish ko'rsatkichi"
      : winRatePct >= 55
        ? `So'nggi ${samples} setupda ${winRatePct}% muvaffaqiyat — qoidalar ishlayapti`
        : `So'nggi ${samples} setupda ${winRatePct}% — ehtiyot, filterlarga rioya qiling`;

  return {
    horizon,
    samples,
    wins,
    losses,
    winRatePct,
    avgRR,
    noteUz,
  };
}
