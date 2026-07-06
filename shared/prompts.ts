import type { AiTradeSignal } from "./ai-trade-signal";
import { MIN_TP_USD, SWING_MIN_RR } from "./pip-targets";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function parseRiskRewardValue(
  raw: unknown,
  entry: number,
  stopLoss: number,
  takeProfit: number
): number {
  if (typeof raw === "string") {
    const s = raw.trim().replace(/%/g, "");
    const ratio = s.match(/^1\s*:\s*([\d.]+)$/i);
    if (ratio) return Number(ratio[1]) || 0;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  return risk > 0 ? round2(reward / risk) : 0;
}

/** TP ni R:R ga moslashtiradi */
export function fixSignalLevelsForMinRr(
  action: "BUY" | "SELL",
  entry: number,
  stopLoss: number,
  takeProfit: number,
  minRr = SWING_MIN_RR
): { entry: number; stopLoss: number; takeProfit: number; riskReward: number } {
  const risk = Math.abs(entry - stopLoss);
  if (risk <= 0) {
    return { entry, stopLoss, takeProfit, riskReward: minRr };
  }
  let reward = Math.abs(takeProfit - entry);
  let rr = reward / risk;
  let tp = takeProfit;
  if (reward < MIN_TP_USD) {
    reward = MIN_TP_USD;
    tp = action === "BUY" ? round2(entry + reward) : round2(entry - reward);
    rr = risk > 0 ? reward / risk : minRr;
  } else if (rr < minRr) {
    reward = risk * minRr;
    if (reward < MIN_TP_USD) reward = MIN_TP_USD;
    tp =
      action === "BUY"
        ? round2(entry + reward)
        : round2(entry - reward);
    rr = risk > 0 ? reward / risk : minRr;
  }
  return {
    entry: round2(entry),
    stopLoss: round2(stopLoss),
    takeProfit: tp,
    riskReward: round2(rr),
  };
}

export function parseAiTradeSignalJson(text: string, currentPrice: number): AiTradeSignal {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI javobida JSON topilmadi");
  const raw = JSON.parse(match[0]) as Record<string, unknown>;
  const action = String(raw.action ?? "HOLD").toUpperCase();
  if (action !== "BUY" && action !== "SELL" && action !== "HOLD") {
    throw new Error("action BUY, SELL yoki HOLD bo'lishi kerak");
  }

  const entry = Number(raw.entry);
  const stopLoss = Number(raw.stopLoss);
  const takeProfit = Number(raw.takeProfit);
  if (![entry, stopLoss, takeProfit].every((n) => Number.isFinite(n) && n > 100)) {
    throw new Error("entry, stopLoss, takeProfit raqam bo'lishi kerak");
  }

  if (action === "BUY") {
    if (!(stopLoss < entry && entry < takeProfit)) {
      throw new Error("BUY: stopLoss < entry < takeProfit bo'lishi kerak");
    }
  } else if (action === "SELL") {
    if (!(takeProfit < entry && entry < stopLoss)) {
      throw new Error("SELL: takeProfit < entry < stopLoss bo'lishi kerak");
    }
  }

  let outEntry = entry;
  let outSl = stopLoss;
  let outTp = takeProfit;
  let riskReward = parseRiskRewardValue(raw.riskReward, entry, stopLoss, takeProfit);

  if (action === "BUY" || action === "SELL") {
    const fixed = fixSignalLevelsForMinRr(action, entry, stopLoss, takeProfit);
    outEntry = fixed.entry;
    outSl = fixed.stopLoss;
    outTp = fixed.takeProfit;
    riskReward = fixed.riskReward;
  }

  return {
    action,
    entry: outEntry,
    stopLoss: outSl,
    takeProfit: outTp,
    confidence: Math.min(100, Math.max(0, Math.round(Number(raw.confidence) || 50))),
    riskReward,
    currentPrice: Math.round(currentPrice * 100) / 100,
    analysisUz: String(raw.analysisUz ?? "").slice(0, 900),
    triggerUz: String(raw.triggerUz ?? "").slice(0, 220),
    invalidationUz: String(raw.invalidationUz ?? "").slice(0, 160),
    summaryUz: String(raw.summaryUz ?? "").slice(0, 280),
    createdAt: new Date().toISOString(),
  };
}
