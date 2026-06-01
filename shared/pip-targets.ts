/**
 * XAUUSD — minimal masofa va dinamik tuzatish
 */

import type { AiTradeSignal } from "./ai-trade-signal";
import type { TechnicalAnalysis } from "./types";

export const GOLD_PIP_USD = 0.1;

/** Faqat juda kichik maqsadlarni bloklash — har doim $5 emas */
export const MIN_TP_USD = 5.0;
export const DEFAULT_TP_USD = 6.0;
export const MAX_TP_USD = 25.0;
export const MIN_SL_USD = 2.0;
export const MAX_SL_USD = 12.0;
export const SWING_MIN_RR = 1.2;

export const SWING_MIN_TP_PIPS = MIN_TP_USD / GOLD_PIP_USD;
export const SWING_MIN_SL_PIPS = MIN_SL_USD / GOLD_PIP_USD;
export const SWING_MIN_RR_EXPORT = SWING_MIN_RR;

export function pipsToUsd(pips: number): number {
  return Math.round(pips * GOLD_PIP_USD * 100) / 100;
}

export function usdToPips(usd: number): number {
  return Math.round((usd / GOLD_PIP_USD) * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function roomToMoveUsd(
  price: number,
  tech: TechnicalAnalysis,
  direction: "BUY" | "SELL"
): number {
  if (direction === "BUY") {
    const targets = tech.resistance.filter((r) => r > price + 0.5);
    if (targets.length) return Math.max(0, targets[0] - price);
    return 15;
  }
  const targets = tech.support.filter((s) => s < price - 0.5);
  if (targets.length) return Math.max(0, price - targets[0]);
  return 15;
}

export interface SwingEnforceResult {
  signal: AiTradeSignal;
  adjusted: boolean;
  rejected: boolean;
  reasonUz?: string;
  targetPips?: number;
}

/** Signal darajalarini tekshir — faqat juda kichik TP/SL ni tuzatadi */
export function enforceSwingTargets(
  signal: AiTradeSignal,
  price: number,
  tech: TechnicalAnalysis
): SwingEnforceResult {
  if (signal.action === "HOLD") return { signal, adjusted: false, rejected: false };

  let entry = round2(price);
  let sl = signal.stopLoss;
  let tp = signal.takeProfit;
  let reward = Math.abs(tp - entry);
  let risk = Math.abs(entry - sl);
  const room = roomToMoveUsd(price, tech, signal.action);
  let adjusted = false;

  if (reward < MIN_TP_USD) {
    const target = Math.min(room * 0.92, Math.max(MIN_TP_USD, reward));
    if (target < MIN_TP_USD) {
      return {
        signal: holdSignal(
          signal,
          price,
          `Qarshilik yaqin — $${MIN_TP_USD} dan katta harakat joyi yo'q`
        ),
        adjusted: true,
        rejected: true,
        reasonUz: "Joy yetarli emas",
      };
    }
    tp =
      signal.action === "BUY"
        ? round2(entry + target)
        : round2(entry - target);
    reward = target;
    adjusted = true;
  }

  if (risk < MIN_SL_USD) {
    sl =
      signal.action === "BUY"
        ? round2(entry - MIN_SL_USD)
        : round2(entry + MIN_SL_USD);
    risk = MIN_SL_USD;
    adjusted = true;
  }

  let rr = risk > 0 ? reward / risk : 0;
  if (rr < SWING_MIN_RR && risk > 0 && reward < room) {
    tp =
      signal.action === "BUY"
        ? round2(entry + risk * SWING_MIN_RR)
        : round2(entry - risk * SWING_MIN_RR);
    reward = Math.abs(tp - entry);
    rr = SWING_MIN_RR;
    adjusted = true;
  }

  const targetPips = usdToPips(reward);
  return {
    signal: {
      ...signal,
      entry,
      stopLoss: sl,
      takeProfit: tp,
      riskReward: round2(rr),
      currentPrice: round2(price),
      targetMoveUsd: round2(reward),
      summaryUz:
        signal.summaryUz ||
        `${signal.action} · maqsad $${tp} (+$${reward.toFixed(2)}) · SL $${sl}`,
    },
    adjusted,
    rejected: false,
    targetPips,
  };
}

function holdSignal(base: AiTradeSignal, price: number, reason: string): AiTradeSignal {
  return {
    ...base,
    action: "HOLD",
    confidence: Math.min(base.confidence, 50),
    currentPrice: round2(price),
    summaryUz: base.summaryUz?.startsWith("HOLD") ? base.summaryUz : `HOLD — ${reason}`,
    analysisUz: `${base.analysisUz}\n${reason}`.trim(),
  };
}

export function formatSwingTargetsForAi(price: number, tech: TechnicalAnalysis): string {
  const res = tech.resistance.filter((r) => r > price).slice(0, 2);
  const sup = tech.support.filter((s) => s < price).slice(-2);
  return `Narxlar: qarshilik ${res.join(", ") || "—"} | qo'llab ${sup.join(", ") || "—"} | ATR $${tech.atr}
TP — yaqin qarshilik/qo'llab-quvvatlash, min $${MIN_TP_USD} masofa, lekin $5 ga bog'lanmang.`;
}
