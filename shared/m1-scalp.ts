/**
 * M1 skalping — trendni oldindan (forming) aniqlash, qisqa SL/TP
 */

import type { Candle, TechnicalAnalysis } from "./types";
import { analyzeTechnicals } from "./technical";
import type { PriceImpulse } from "./price-impulse";
import {
  pipsToUsd,
  SWING_MIN_SL_PIPS,
  SWING_MAX_SL_PIPS,
  SWING_DEFAULT_TP_PIPS,
  SWING_MAX_TP_PIPS,
  usdToPips,
} from "./pip-targets";

export type M1ScalpPhase = "forming" | "active" | "exhausted" | "reversal" | "range";

export interface M1ScalpLead {
  direction: "long" | "short" | "neutral";
  strength: number;
  phase: M1ScalpPhase;
  structureUz: string;
  emaCrossUz: string;
  nextMoveUz: string;
  entryHint: number;
  stopHint: number;
  tpHint: number;
  maxHoldMin: number;
  /** AI va UI uchun qisqa blok */
  summaryUz: string;
}

function ema(closes: number[], period: number): number {
  if (!closes.length) return 0;
  const k = 2 / (period + 1);
  let v = closes[0];
  for (let i = 1; i < closes.length; i++) v = closes[i] * k + v * (1 - k);
  return v;
}

/** Oxirgi 3–4 sham yopilish yo'nalishi — EMA dan muhimroq (skalp) */
function recentCloseMomentum(candles: Candle[]): {
  score: number;
  direction: "up" | "down" | "flat";
  note: string;
} {
  const slice = candles.slice(-4);
  if (slice.length < 2) return { score: 0, direction: "flat", note: "—" };
  let score = 0;
  for (let i = 1; i < slice.length; i++) {
    score += slice[i].close - slice[i - 1].close;
  }
  const last = slice[slice.length - 1];
  score += (last.close - last.open) * 0.5;
  const direction = score > 0.25 ? "up" : score < -0.25 ? "down" : "flat";
  const note =
    direction === "up"
      ? `Oxirgi shamlar YUQORI (+$${score.toFixed(2)})`
      : direction === "down"
        ? `Oxirgi shamlar PAST ($${score.toFixed(2)})`
        : "Oxirgi shamlar yon";
  return { score, direction, note };
}

function structureBias(candles: Candle[]): { long: number; short: number; note: string } {
  const slice = candles.slice(-6);
  if (slice.length < 4) return { long: 0, short: 0, note: "Sham yetarli emas" };
  let hh = 0;
  let ll = 0;
  for (let i = 1; i < slice.length; i++) {
    if (slice[i].high > slice[i - 1].high) hh++;
    if (slice[i].low < slice[i - 1].low) ll++;
  }
  const bullBodies = slice.filter((c) => c.close > c.open).length;
  const bearBodies = slice.length - bullBodies;
  let l = hh * 14 + bullBodies * 8;
  let s = ll * 14 + bearBodies * 8;
  const note =
    hh >= 3 && ll <= 1
      ? "HH seriyasi — long shakllanmoqda"
      : ll >= 3 && hh <= 1
        ? "LL seriyasi — short shakllanmoqda"
        : hh > ll
          ? "Yuqori minima ko'tarilmoqda"
          : ll > hh
            ? "Pastki maksimumlar tushmoqda"
            : "Range / aralash";
  return { long: l, short: s, note };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function analyzeM1ScalpLead(
  candles1m: Candle[],
  candles5m: Candle[],
  price: number,
  impulse?: PriceImpulse | null
): M1ScalpLead {
  const c1 =
    candles1m.length >= 3
      ? candles1m
      : candles5m.length
        ? candles5m
        : [{ time: 0, open: price, high: price, low: price, close: price }];
  const tech1 = analyzeTechnicals(c1);
  const tech5 = candles5m.length >= 5 ? analyzeTechnicals(candles5m) : tech1;
  const atr = tech1.atr || price * 0.0008;
  const closes = c1.map((c) => c.close);
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, Math.min(21, closes.length));
  const prevCloses = closes.slice(0, -1);
  const prevEma9 = ema(prevCloses, 9);
  const prevEma21 = ema(prevCloses, Math.min(21, prevCloses.length));

  const struct = structureBias(c1);
  const recent = recentCloseMomentum(c1);
  let longPts = struct.long;
  let shortPts = struct.short;

  if (recent.direction === "up") longPts += 32;
  else if (recent.direction === "down") shortPts += 32;

  if (ema9 > ema21) longPts += 14;
  else if (ema9 < ema21) shortPts += 14;
  if (prevEma9 <= prevEma21 && ema9 > ema21) longPts += 28;
  if (prevEma9 >= prevEma21 && ema9 < ema21) shortPts += 28;

  if (tech1.trend === "bullish") longPts += 16;
  if (tech1.trend === "bearish") shortPts += 16;
  if (tech5.trend === "bullish") longPts += 10;
  if (tech5.trend === "bearish") shortPts += 10;

  if (price > ema9 && ema9 > ema21) longPts += 12;
  if (price < ema9 && ema9 < ema21) shortPts += 12;

  if (tech1.rsi > 72) {
    shortPts += 12;
    longPts -= 12;
  } else if (tech1.rsi < 28) {
    longPts += 18;
    shortPts -= 14;
  } else if (tech1.rsi > 62) {
    shortPts += 8;
    longPts -= 6;
  } else if (tech1.rsi < 38) {
    longPts += 16;
    shortPts -= 12;
  }

  if (impulse && impulse.moveUsd >= 0.35) {
    if (impulse.direction === "long") longPts += 20 + impulse.moveUsd * 6;
    else shortPts += 20 + impulse.moveUsd * 6;
  }

  const lead = longPts - shortPts;
  let direction: M1ScalpLead["direction"] = "neutral";
  if (lead >= 22 && recent.direction !== "down") direction = "long";
  else if (lead <= -22 && recent.direction !== "up") direction = "short";
  else if (recent.direction === "up" && lead >= 8) direction = "long";
  else if (recent.direction === "down" && lead <= -8) direction = "short";

  if (direction === "short" && tech1.rsi < 40 && recent.direction !== "down") {
    direction = "neutral";
  }
  if (direction === "long" && tech1.rsi > 60 && recent.direction !== "up") {
    direction = "neutral";
  }

  let phase: M1ScalpPhase = "range";
  if (Math.abs(lead) >= 35 && tech1.adx >= 14) phase = "active";
  else if (Math.abs(lead) >= 18) phase = "forming";
  if (
    (direction === "long" && tech1.rsi > 74) ||
    (direction === "short" && tech1.rsi < 26)
  ) {
    phase = "exhausted";
  }
  if (
    (recent.direction === "up" && direction === "short") ||
    (recent.direction === "down" && direction === "long")
  ) {
    phase = "reversal";
    direction = recent.direction === "up" ? "long" : "short";
  }
  if (
    (tech5.trend === "bullish" && direction === "short" && lead <= -25) ||
    (tech5.trend === "bearish" && direction === "long" && lead >= 25)
  ) {
    phase = "reversal";
  }

  const strength = Math.min(98, Math.round(Math.abs(lead) * 1.1 + tech1.adx * 0.5));

  const slDist = Math.min(
    Math.max(pipsToUsd(SWING_MIN_SL_PIPS), atr * 1.2),
    pipsToUsd(SWING_MAX_SL_PIPS)
  );
  const tpDist = Math.min(
    Math.max(pipsToUsd(SWING_DEFAULT_TP_PIPS), slDist * 1.3),
    pipsToUsd(SWING_MAX_TP_PIPS)
  );

  let entryHint = price;
  let stopHint = price;
  let tpHint = price;

  if (direction === "long") {
    entryHint = round2(price + atr * 0.02);
    stopHint = round2(price - slDist);
    tpHint = round2(price + tpDist);
  } else if (direction === "short") {
    entryHint = round2(price - atr * 0.02);
    stopHint = round2(price + slDist);
    tpHint = round2(price - tpDist);
  } else {
    stopHint = round2(price - slDist);
    tpHint = round2(price + tpDist);
  }

  const emaCrossUz =
    ema9 > ema21
      ? prevEma9 <= prevEma21
        ? "EMA9/21 YUQORI kesish — long trigger"
        : "EMA9 > EMA21 — long ustun"
      : prevEma9 >= prevEma21
        ? "EMA9/21 PAST kesish — short trigger"
        : "EMA9 < EMA21 — short ustun";

  const phaseUz: Record<M1ScalpPhase, string> = {
    forming: "Trend SHAKLLANMOQDA — erta kirish",
    active: "Trend FAOL — impuls davom",
    exhausted: "Charchagan — yangi prognoz yoki HOLD",
    reversal: "5m ga qarshi 1m burilish — ehtiyot",
    range: "Range — breakout kuting",
  };

  const nextMoveUz =
    direction === "long"
      ? `Keyingi harakat: yuqoriga $${tpHint} (~${usdToPips(tpDist)} pip)`
      : direction === "short"
        ? `Keyingi harakat: pastga $${tpHint} (~${usdToPips(tpDist)} pip)`
        : `Kutish: $${tech1.support[0] ?? "—"} / $${tech1.resistance[0] ?? "—"}`;

  const summaryUz = `M1 ${direction.toUpperCase()} ${strength}% · ${phaseUz[phase]} · ${recent.note} · ${struct.note}`;

  return {
    direction,
    strength,
    phase,
    structureUz: struct.note,
    emaCrossUz,
    nextMoveUz,
    entryHint,
    stopHint,
    tpHint,
    maxHoldMin: 480,
    summaryUz,
  };
}

export function formatM1ScalpForAi(
  lead: M1ScalpLead,
  tech1: TechnicalAnalysis,
  tech5: TechnicalAnalysis
): string {
  return `M1 SKALP (asosiy):
- Yo'nalish: ${lead.direction.toUpperCase()} · kuch ${lead.strength}% · fazasi: ${lead.phase}
- ${lead.structureUz}
- ${lead.emaCrossUz}
- ${lead.nextMoveUz}
- Tavsiya zona: kirish ~$${lead.entryHint}, SL ~$${lead.stopHint}, TP ~$${lead.tpHint}, max ${lead.maxHoldMin} daq
- 1m: RSI ${tech1.rsi}, ADX ${tech1.adx}, ATR $${tech1.atr}, trend ${tech1.trend}
- 5m filter: trend ${tech5.trend}, RSI ${tech5.rsi}
QOIDA: Maqsad min 10 pip TP. JONLI sham ustun. RSI<38 SELL taqiq.`;
}
