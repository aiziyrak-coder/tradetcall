/**
 * XAUUSD — narx farqi $ (1 pip = $0.10)
 * Savdo uchun kamida $5 TP masofasi (spread/slippage uchun)
 */

import type { AiTradeSignal } from "./ai-trade-signal";
import type { TechnicalAnalysis } from "./types";

export const GOLD_PIP_USD = 0.1;

/** Minimal TP masofasi — oltin narxi bo'yicha $ */
export const MIN_TP_USD = 5.0;
export const DEFAULT_TP_USD = 5.0;
export const MAX_TP_USD = 8.0;
export const MIN_SL_USD = 2.5;
export const MAX_SL_USD = 4.0;

export const SWING_MIN_TP_PIPS = MIN_TP_USD / GOLD_PIP_USD;
export const SWING_DEFAULT_TP_PIPS = DEFAULT_TP_USD / GOLD_PIP_USD;
export const SWING_MAX_TP_PIPS = MAX_TP_USD / GOLD_PIP_USD;
export const SWING_MIN_SL_PIPS = MIN_SL_USD / GOLD_PIP_USD;
export const SWING_MAX_SL_PIPS = MAX_SL_USD / GOLD_PIP_USD;
export const SWING_MIN_RR = 1.2;

export function pipsToUsd(pips: number): number {
  return Math.round(pips * GOLD_PIP_USD * 100) / 100;
}

export function usdToPips(usd: number): number {
  return Math.round((usd / GOLD_PIP_USD) * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Keyingi qarshilik/qo'llab-quvvatlashgacha bo'sh joy ($) */
export function roomToMoveUsd(
  price: number,
  tech: TechnicalAnalysis,
  direction: "BUY" | "SELL"
): number {
  if (direction === "BUY") {
    const targets = tech.resistance.filter((r) => r > price + 0.5);
    if (targets.length) return Math.max(0, targets[0] - price);
    return pipsToUsd(SWING_MAX_TP_PIPS);
  }
  const targets = tech.support.filter((s) => s < price - 0.5);
  if (targets.length) return Math.max(0, price - targets[0]);
  return pipsToUsd(SWING_MAX_TP_PIPS);
}

export interface SwingEnforceResult {
  signal: AiTradeSignal;
  adjusted: boolean;
  rejected: boolean;
  reasonUz?: string;
  targetPips?: number;
}

/** AI signal — kirish hozirgi narx, TP min $5 */
export function enforceSwingTargets(
  signal: AiTradeSignal,
  price: number,
  tech: TechnicalAnalysis
): SwingEnforceResult {
  if (signal.action === "HOLD") return { signal, adjusted: false, rejected: false };

  const minReward = MIN_TP_USD;
  const maxReward = MAX_TP_USD;
  const defaultReward = DEFAULT_TP_USD;
  const minSl = MIN_SL_USD;
  const maxSl = MAX_SL_USD;

  const room = roomToMoveUsd(price, tech, signal.action);
  if (room < minReward * 0.98) {
    return {
      signal: holdSignal(signal, price, `Bo'sh joy yetarli emas — maqsadga ~${usdToPips(room)} pip`),
      adjusted: true,
      rejected: true,
      reasonUz: `Kamida $${MIN_TP_USD} uchun joy yo'q`,
    };
  }

  let entry = round2(price);
  let sl = signal.stopLoss;
  let tp = signal.takeProfit;

  let reward = Math.abs(tp - entry);
  let risk = Math.abs(entry - sl);

  if (reward < minReward) {
    const targetReward = Math.min(maxReward, Math.max(minReward, defaultReward, room * 0.98));
    tp =
      signal.action === "BUY"
        ? round2(entry + targetReward)
        : round2(entry - targetReward);
    reward = targetReward;
  } else if (reward > maxReward * 1.02) {
    tp =
      signal.action === "BUY"
        ? round2(entry + maxReward)
        : round2(entry - maxReward);
    reward = maxReward;
  }

  if (risk < minSl) {
    sl =
      signal.action === "BUY"
        ? round2(entry - minSl)
        : round2(entry + minSl);
    risk = minSl;
  } else if (risk > maxSl) {
    sl =
      signal.action === "BUY"
        ? round2(entry - maxSl)
        : round2(entry + maxSl);
    risk = maxSl;
  }

  let rr = risk > 0 ? reward / risk : 0;
  if (rr < SWING_MIN_RR && risk > 0) {
    const needReward = risk * SWING_MIN_RR;
    if (needReward <= maxReward && needReward <= room) {
      tp =
        signal.action === "BUY"
          ? round2(entry + needReward)
          : round2(entry - needReward);
      reward = needReward;
      rr = SWING_MIN_RR;
    }
  }

  reward = Math.abs(tp - entry);
  if (reward < minReward * 0.98) {
    return {
      signal: holdSignal(
        signal,
        price,
        `TP juda kichik ($${reward.toFixed(2)}) — min $${MIN_TP_USD}`
      ),
      adjusted: true,
      rejected: true,
      reasonUz: `$${MIN_TP_USD} dan kichik maqsad`,
    };
  }

  const targetPips = usdToPips(reward);
  const rewardUsd = reward.toFixed(2);
  const adjusted =
    Math.abs(tp - signal.takeProfit) > 0.05 ||
    Math.abs(sl - signal.stopLoss) > 0.05;

  return {
    signal: {
      ...signal,
      entry: round2(entry),
      stopLoss: round2(sl),
      takeProfit: round2(tp),
      riskReward: Math.round(rr * 100) / 100,
      currentPrice: round2(price),
      summaryUz: `${signal.action} · kirish $${entry} · TP +$${rewardUsd} · SL -$${risk.toFixed(2)}`,
      triggerUz: `Hozir $${entry} — maqsad $${tp} (+$${rewardUsd})`,
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
    confidence: Math.min(base.confidence, 45),
    currentPrice: round2(price),
    summaryUz: `HOLD — ${reason}`,
    triggerUz: `Maqsad kamida $${MIN_TP_USD} kerak — kuting`,
    analysisUz: `${base.analysisUz}\n\n[Maqsad] ${reason}`,
  };
}

export function formatSwingTargetsForAi(price: number, tech: TechnicalAnalysis): string {
  const minUsd = pipsToUsd(SWING_MIN_TP_PIPS);
  const maxUsd = pipsToUsd(SWING_MAX_TP_PIPS);
  return `MAQSAD:
- Kirish = HOZIRGI narx
- TP min $${MIN_TP_USD} (odatda $${DEFAULT_TP_USD}), max $${MAX_TP_USD}
- SL $${MIN_SL_USD}–$${MAX_SL_USD}
- $1 dan kichik TP bermang`;
}
