/**
 * Aniq BUY/SELL — M1 + jonli momentum + setup uyg'un bo'lsa (AI HOLD qaytarsa ham)
 */

import type { AiTradeSignal } from "./ai-trade-signal";
import type { TechnicalAnalysis } from "./types";
import type { M1ScalpLead } from "./m1-scalp";
import type { LiveMomentum } from "./scalp-signal-guard";
import type { SetupQuality } from "./setup-quality";
import {
  pipsToUsd,
  SWING_DEFAULT_TP_PIPS,
  SWING_MIN_SL_PIPS,
} from "./pip-targets";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function buildLevels(
  action: "BUY" | "SELL",
  price: number,
  tech: TechnicalAnalysis
): { entry: number; stopLoss: number; takeProfit: number; riskReward: number } {
  const slUsd = pipsToUsd(SWING_MIN_SL_PIPS);
  const tpUsd = pipsToUsd(SWING_DEFAULT_TP_PIPS);
  const entry = round2(price);
  if (action === "BUY") {
    const stopLoss = round2(Math.min(entry - slUsd, tech.support[0] ?? entry - slUsd));
    const takeProfit = round2(entry + tpUsd);
    const risk = entry - stopLoss;
    const reward = takeProfit - entry;
    return {
      entry,
      stopLoss,
      takeProfit,
      riskReward: risk > 0 ? Math.round((reward / risk) * 100) / 100 : 1.5,
    };
  }
  const stopLoss = round2(Math.max(entry + slUsd, tech.resistance[0] ?? entry + slUsd));
  const takeProfit = round2(entry - tpUsd);
  const risk = stopLoss - entry;
  const reward = entry - takeProfit;
  return {
    entry,
    stopLoss,
    takeProfit,
    riskReward: risk > 0 ? Math.round((reward / risk) * 100) / 100 : 1.5,
  };
}

export function deriveClearSignal(input: {
  price: number;
  tech: TechnicalAnalysis;
  tech5: TechnicalAnalysis;
  setupQ: SetupQuality;
  m1Scalp: M1ScalpLead | null;
  live: LiveMomentum;
}): AiTradeSignal | null {
  let buy = 0;
  let sell = 0;
  const buyWhy: string[] = [];
  const sellWhy: string[] = [];

  const { longScore, shortScore } = input.setupQ;
  if (longScore >= shortScore + 10) {
    buy += 2;
    buyWhy.push(`setup long ${longScore}`);
  }
  if (shortScore >= longScore + 10) {
    sell += 2;
    sellWhy.push(`setup short ${shortScore}`);
  }

  const m1 = input.m1Scalp;
  if (m1?.direction === "long" && m1.strength >= 40 && m1.phase !== "exhausted") {
    buy += 2;
    buyWhy.push(`M1 ${m1.phase}`);
  }
  if (m1?.direction === "short" && m1.strength >= 40 && m1.phase !== "exhausted") {
    sell += 2;
    sellWhy.push(`M1 ${m1.phase}`);
  }

  if (input.live.direction === "up") {
    buy += 2;
    buyWhy.push(input.live.summaryUz.slice(0, 40));
  }
  if (input.live.direction === "down") {
    sell += 2;
    sellWhy.push(input.live.summaryUz.slice(0, 40));
  }

  if (input.tech.trend === "bullish") buy += 1;
  if (input.tech.trend === "bearish") sell += 1;
  if (input.tech5.trend === "bullish") buy += 1;
  if (input.tech5.trend === "bearish") sell += 1;

  const e1 = input.tech.enhanced;
  if (e1?.macdBias === "bullish") buy += 1;
  if (e1?.macdBias === "bearish") sell += 1;

  const minVotes = 5;
  const margin = 2;

  if (buy >= minVotes && buy > sell + margin) {
    const levels = buildLevels("BUY", input.price, input.tech);
    const conf = Math.min(78, 52 + buy * 3 + Math.min(12, longScore / 5));
    return {
      action: "BUY",
      ...levels,
      confidence: conf,
      currentPrice: round2(input.price),
      summaryUz: `BUY — aniq yo'nalish (ball ${buy}): ${buyWhy.slice(0, 3).join("; ")}`,
      triggerUz: `Hozir yoki ${levels.entry} atrofida — SL ${levels.stopLoss}`,
      invalidationUz: `${levels.stopLoss} past — long bekor`,
      analysisUz: `Qoida asosidagi signal: M1/jonli momentum va setup LONG ustun. ADX past bo'lsa ham yo'nalish aniq. Maqsad ~${SWING_DEFAULT_TP_PIPS} pip.`,
      createdAt: new Date().toISOString(),
    };
  }

  if (sell >= minVotes && sell > buy + margin) {
    const levels = buildLevels("SELL", input.price, input.tech);
    const conf = Math.min(78, 52 + sell * 3 + Math.min(12, shortScore / 5));
    return {
      action: "SELL",
      ...levels,
      confidence: conf,
      currentPrice: round2(input.price),
      summaryUz: `SELL — aniq yo'nalish (ball ${sell}): ${sellWhy.slice(0, 3).join("; ")}`,
      triggerUz: `Hozir yoki ${levels.entry} atrofida — SL ${levels.stopLoss}`,
      invalidationUz: `${levels.stopLoss} yuqori — short bekor`,
      analysisUz: `Qoida asosidagi signal: M1/jonli momentum va setup SHORT ustun. Maqsad ~${SWING_DEFAULT_TP_PIPS} pip.`,
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

export function minConfidenceForSetup(score: number): number {
  if (score >= 62) return 55;
  if (score >= 50) return 58;
  if (score >= 42) return 62;
  return 68;
}
