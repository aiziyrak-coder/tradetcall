/**
 * Bozor bashorati — qo'llab-quvvatlash/qarshilik, ATR, momentum asosida aniq narxlar.
 * $5 faqat MINIMUM masofa, har doim $5 emas.
 */

import type { AiTradeSignal } from "./ai-trade-signal";
import type { TechnicalAnalysis } from "./types";
import type { M1ScalpLead } from "./m1-scalp";
import type { LiveMomentum } from "./scalp-signal-guard";
import type { SetupQuality } from "./setup-quality";
import type { NewsMarketAnalysis } from "./types";
import { GOLD_PIP_USD, MIN_SL_USD, MIN_TP_USD, SWING_MIN_RR } from "./pip-targets";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface MarketForecastInput {
  price: number;
  tech1: TechnicalAnalysis;
  tech5: TechnicalAnalysis;
  setupQ: SetupQuality;
  m1Scalp: M1ScalpLead | null;
  live: LiveMomentum;
  news?: NewsMarketAnalysis | null;
}

export interface TradeLevels {
  action: "BUY" | "SELL" | "HOLD";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  confidence: number;
  targetUsd: number;
  riskUsd: number;
  forecastHigh: number;
  forecastLow: number;
  biasUz: string;
  summaryUz: string;
  triggerUz: string;
  invalidationUz: string;
  analysisUz: string;
}

function nearestResistance(price: number, tech: TechnicalAnalysis): number | null {
  const r = tech.resistance.filter((x) => x > price + 0.25).sort((a, b) => a - b);
  return r[0] ?? null;
}

function nearestSupport(price: number, tech: TechnicalAnalysis): number | null {
  const s = tech.support.filter((x) => x < price - 0.25).sort((a, b) => b - a);
  return s[0] ?? null;
}

function clampReward(reward: number, atr: number): number {
  const maxMove = Math.max(MIN_TP_USD, atr * 6, 12);
  return Math.min(Math.max(reward, MIN_TP_USD), maxMove);
}

function buildTradeLevels(
  action: "BUY" | "SELL",
  price: number,
  tech: TechnicalAnalysis,
  tech5: TechnicalAnalysis
): Pick<TradeLevels, "entry" | "stopLoss" | "takeProfit" | "riskReward" | "targetUsd" | "riskUsd"> {
  const atr = Math.max(tech.atr, 0.8);
  const entry = round2(price);

  if (action === "BUY") {
    const res = nearestResistance(price, tech);
    const sup = nearestSupport(price, tech);
    let tp = res != null ? round2(res - 0.15) : round2(price + atr * 3);
    let reward = tp - entry;
    reward = clampReward(reward, atr);
    tp = round2(entry + reward);

    let sl = sup != null ? round2(sup - 0.1) : round2(entry - atr * 1.4);
    if (entry - sl < MIN_SL_USD) sl = round2(entry - Math.max(MIN_SL_USD, atr * 1.1));
    if (entry - sl > atr * 2.5) sl = round2(entry - atr * 1.8);

    let risk = entry - sl;
    if (reward / risk < SWING_MIN_RR) {
      tp = round2(entry + risk * SWING_MIN_RR);
      reward = tp - entry;
    }
    return {
      entry,
      stopLoss: sl,
      takeProfit: tp,
      riskReward: risk > 0 ? round2(reward / risk) : SWING_MIN_RR,
      targetUsd: round2(reward),
      riskUsd: round2(risk),
    };
  }

  const sup = nearestSupport(price, tech);
  const res = nearestResistance(price, tech);
  let tp = sup != null ? round2(sup + 0.15) : round2(price - atr * 3);
  let reward = entry - tp;
  reward = clampReward(reward, atr);
  tp = round2(entry - reward);

  let sl = res != null ? round2(res + 0.1) : round2(entry + atr * 1.4);
  if (sl - entry < MIN_SL_USD) sl = round2(entry + Math.max(MIN_SL_USD, atr * 1.1));
  if (sl - entry > atr * 2.5) sl = round2(entry + atr * 1.8);

  let risk = sl - entry;
  if (reward / risk < SWING_MIN_RR) {
    tp = round2(entry - risk * SWING_MIN_RR);
    reward = entry - tp;
  }
  return {
    entry,
    stopLoss: sl,
    takeProfit: tp,
    riskReward: risk > 0 ? round2(reward / risk) : SWING_MIN_RR,
    targetUsd: round2(reward),
    riskUsd: round2(risk),
  };
}

export function computeMarketForecast(input: MarketForecastInput): TradeLevels {
  const { price, tech1, tech5, setupQ, m1Scalp, live, news } = input;
  const atr = Math.max(tech1.atr, 0.8);
  const { longScore, shortScore } = setupQ;

  const forecastHigh = round2(
    nearestResistance(price, tech1) ?? price + Math.max(atr * 4, MIN_TP_USD)
  );
  const forecastLow = round2(
    nearestSupport(price, tech1) ?? price - Math.max(atr * 4, MIN_TP_USD)
  );

  let biasUz = "NEUTRAL";
  if (longScore >= shortScore + 12) biasUz = "LONG moyil";
  else if (shortScore >= longScore + 12) biasUz = "SHORT moyil";

  const reasons: string[] = [];
  if (setupQ.reasonsUz.length) reasons.push(...setupQ.reasonsUz.slice(0, 2));
  if (setupQ.warningsUz.length) reasons.push(...setupQ.warningsUz.slice(0, 2));
  if (m1Scalp) reasons.push(m1Scalp.summaryUz.slice(0, 80));
  reasons.push(live.summaryUz.slice(0, 60));

  const margin = Math.abs(longScore - shortScore);
  const m1 = m1Scalp;
  let action: "BUY" | "SELL" | "HOLD" = "HOLD";

  if (
    longScore >= shortScore + 6 &&
    margin >= 5 &&
    (m1?.direction !== "short" || m1.strength < 60) &&
    live.direction !== "down"
  ) {
    action = "BUY";
  } else if (
    shortScore >= longScore + 6 &&
    margin >= 5 &&
    (m1?.direction !== "long" || m1.strength < 60) &&
    live.direction !== "up"
  ) {
    action = "SELL";
  }

  if (news?.contradictionsUz && margin < 12) action = "HOLD";
  if (tech1.adx < 12 && margin < 10) action = "HOLD";

  if (action === "HOLD") {
    return buildHoldForecast(input, forecastHigh, forecastLow, biasUz, reasons, margin);
  }

  const levels = buildTradeLevels(action, price, tech1, tech5);
  const dirUz = action === "BUY" ? "yuqoriga" : "pastga";
  const sup = nearestSupport(price, tech1);
  const res = nearestResistance(price, tech1);

  const analysisUz = [
    `Bashorat: narx ${dirUz} $${levels.targetUsd} harakat mumkin (maqsad $${levels.takeProfit}).`,
    `M1: trend ${tech1.trend}, RSI ${tech1.rsi}, ADX ${tech1.adx}. 5m: ${tech5.trend}.`,
    sup != null ? `Qo'llab-quvvatlash $${sup} — SL shu atrofda.` : "",
    res != null ? `Qarshilik $${res} — TP yaqin.` : "",
    `Kutilgan diapazon bugun: $${forecastLow} – $${forecastHigh}.`,
    news?.tradeVerdictUz ? `Yangilik: ${news.tradeVerdictUz.slice(0, 100)}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const conf = Math.min(
    85,
    Math.round(52 + margin * 0.8 + setupQ.score * 0.2 + (action === "BUY" ? longScore : shortScore) * 0.15)
  );

  return {
    action,
    ...levels,
    confidence: conf,
    forecastHigh,
    forecastLow,
    biasUz,
    summaryUz: `${action} — maqsad $${levels.takeProfit} (${levels.targetUsd}$ ${dirUz}), SL $${levels.stopLoss}`,
    triggerUz:
      action === "BUY"
        ? `Kirish $${levels.entry} (hozir $${price}). TP $${levels.takeProfit} — qarshilikgacha.`
        : `Kirish $${levels.entry}. TP $${levels.takeProfit} — qo'llab-quvvatlashgacha.`,
    invalidationUz:
      action === "BUY"
        ? `$${levels.stopLoss} yopilish — long bekor`
        : `$${levels.stopLoss} yopilish — short bekor`,
    analysisUz,
  };
}

function buildHoldForecast(
  input: MarketForecastInput,
  forecastHigh: number,
  forecastLow: number,
  biasUz: string,
  reasons: string[],
  margin: number
): TradeLevels {
  const { price, tech1, setupQ, m1Scalp, live, news } = input;
  const atr = Math.max(tech1.atr, 0.8);
  const entry = round2(price);

  const whyHold =
    margin < 8
      ? "Long va short signallar teng — aniq yo'nalish yo'q"
      : setupQ.warningsUz[0] ??
        (tech1.adx < 16 ? "ADX past — range, trend zaif" : "Shartlar aralash");

  const bullTrigger = round2(forecastHigh - 0.2);
  const bearTrigger = round2(forecastLow + 0.2);

  const scenarioBull = `Agar $${bullTrigger} dan yuqori breakout → LONG maqsad $${round2(forecastHigh + atr)} (qarshilikdan keyin).`;
  const scenarioBear = `Agar $${bearTrigger} dan past breakout → SHORT maqsad $${round2(forecastLow - atr)}.`;

  const analysisUz = [
    `HOLD — hozir kirmang. Sabab: ${whyHold}.`,
    `Bozor diapazoni: $${forecastLow} (past) — $${forecastHigh} (yuqori). Hozir $${price}.`,
    `Moyil: ${biasUz}. M1 ${tech1.trend}, RSI ${tech1.rsi}. Jonli: ${live.summaryUz}`,
    m1Scalp ? m1Scalp.nextMoveUz : "",
    scenarioBull,
    scenarioBear,
    news?.recommendationUz ? `Yangilik: ${news.recommendationUz.slice(0, 120)}` : "",
    `Keyingi prognoz: breakout yoki ADX oshganda qayta bosing.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    action: "HOLD",
    entry,
    stopLoss: round2(forecastLow - atr * 0.5),
    takeProfit: round2(forecastHigh + atr * 0.5),
    riskReward: 0,
    confidence: Math.min(58, Math.max(38, setupQ.score - 5)),
    targetUsd: round2(forecastHigh - price),
    riskUsd: round2(price - forecastLow),
    forecastHigh,
    forecastLow,
    biasUz,
    summaryUz: `HOLD — ${whyHold}. Diapazon $${forecastLow}–$${forecastHigh}`,
    triggerUz: `${scenarioBull} ${scenarioBear}`,
    invalidationUz: `Range ichida qoling — breakout bo'lmaguncha lot ochmang`,
    analysisUz,
  };
}

export function tradeLevelsToAiSignal(
  f: TradeLevels,
  currentPrice: number
): AiTradeSignal {
  return {
    action: f.action,
    entry: f.entry,
    stopLoss: f.stopLoss,
    takeProfit: f.takeProfit,
    confidence: f.confidence,
    riskReward: f.riskReward,
    currentPrice: round2(currentPrice),
    summaryUz: f.summaryUz,
    triggerUz: f.triggerUz,
    invalidationUz: f.invalidationUz,
    analysisUz: f.analysisUz,
    createdAt: new Date().toISOString(),
    forecastHigh: f.forecastHigh,
    forecastLow: f.forecastLow,
    forecastBiasUz: f.biasUz,
    targetMoveUsd: f.targetUsd,
  };
}
