/**
 * XAUUSD pip maqsadlari — 1 pip = $0.10 (standart broker)
 * 10 pip = $1.00
 */

import type { AiTradeSignal } from "./ai-trade-signal";
import type { TechnicalAnalysis } from "./types";

export const GOLD_PIP_USD = 0.1;

export const SWING_MIN_TP_PIPS = 10;
export const SWING_MAX_TP_PIPS = 25;
export const SWING_DEFAULT_TP_PIPS = 15;
export const SWING_MIN_SL_PIPS = 8;
export const SWING_MAX_SL_PIPS = 15;
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

/** AI signal — kamida 10 pip TP, skalp diapazon */
export function enforceSwingTargets(
  signal: AiTradeSignal,
  price: number,
  tech: TechnicalAnalysis
): SwingEnforceResult {
  if (signal.action === "HOLD") return { signal, adjusted: false, rejected: false };

  const minReward = pipsToUsd(SWING_MIN_TP_PIPS);
  const maxReward = pipsToUsd(SWING_MAX_TP_PIPS);
  const defaultReward = pipsToUsd(SWING_DEFAULT_TP_PIPS);
  const minSl = pipsToUsd(SWING_MIN_SL_PIPS);
  const maxSl = pipsToUsd(SWING_MAX_SL_PIPS);

  const room = roomToMoveUsd(price, tech, signal.action);
  if (room < minReward * 0.85) {
    return {
      signal: holdSignal(signal, price, `Bo'sh joy yetarli emas — maqsadga ~${usdToPips(room)} pip (${room.toFixed(2)}$)`),
      adjusted: true,
      rejected: true,
      reasonUz: `Kamida ${SWING_MIN_TP_PIPS} pip uchun joy yo'q`,
    };
  }

  let entry = signal.entry;
  let sl = signal.stopLoss;
  let tp = signal.takeProfit;

  let reward = Math.abs(tp - entry);
  let risk = Math.abs(entry - sl);

  if (reward < minReward) {
    const targetReward = Math.min(maxReward, Math.max(minReward, defaultReward, room * 0.9));
    tp =
      signal.action === "BUY"
        ? round2(entry + targetReward)
        : round2(entry - targetReward);
    reward = targetReward;
  } else if (reward > maxReward * 1.15) {
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
        `TP kam — kerak min ${SWING_MIN_TP_PIPS} pip ($${minReward}), hozir ~${usdToPips(reward)} pip`
      ),
      adjusted: true,
      rejected: true,
      reasonUz: `${SWING_MIN_TP_PIPS} pip dan kichik maqsad`,
    };
  }

  const targetPips = usdToPips(reward);
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
      summaryUz: `${signal.action} · maqsad ~${targetPips} pip ($${reward.toFixed(2)}) · SL ~${usdToPips(risk)} pip`,
      triggerUz: signal.triggerUz.includes("pip")
        ? signal.triggerUz
        : `${signal.triggerUz} · TP ${targetPips} pip`,
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
    triggerUz: `Maqsad (${SWING_MIN_TP_PIPS}+ pip) hali aniq emas — kuting`,
    analysisUz: `${base.analysisUz}\n\n[Maqsad] ${reason}`,
  };
}

export function formatSwingTargetsForAi(price: number, tech: TechnicalAnalysis): string {
  const minUsd = pipsToUsd(SWING_MIN_TP_PIPS);
  const maxUsd = pipsToUsd(SWING_MAX_TP_PIPS);
  return `MAQSAD (skalp):
- Take profit: min ${SWING_MIN_TP_PIPS} pip ($${minUsd}), odatda ${SWING_DEFAULT_TP_PIPS}–${SWING_MAX_TP_PIPS} pip
- Stop loss: ${SWING_MIN_SL_PIPS}–${SWING_MAX_SL_PIPS} pip
- R:R min 1:${SWING_MIN_RR}
- Qo'llab-quvvatlash: ${tech.support.slice(0, 2).join(", ") || "—"}
- Qarshilik: ${tech.resistance.slice(0, 2).join(", ") || "—"}
- ${SWING_MIN_TP_PIPS} pip dan kam TP bermang`;
}
