/**
 * M1 skalp — AI signalini jonli narx/sham bilan tekshirish (teskari signal oldini olish)
 */

import type { AiTradeSignal } from "./ai-trade-signal";
import type { Candle } from "./types";
import type { TechnicalAnalysis } from "./types";
import type { M1ScalpLead } from "./m1-scalp";
import type { PriceImpulse } from "./price-impulse";

export interface LiveMomentum {
  direction: "up" | "down" | "flat";
  changeUsd: number;
  bullishCloses: number;
  bearishCloses: number;
  summaryUz: string;
}

export function getLiveMomentum(candles: Candle[], livePrice: number): LiveMomentum {
  const slice = candles.slice(-4);
  if (slice.length < 2) {
    return {
      direction: "flat",
      changeUsd: 0,
      bullishCloses: 0,
      bearishCloses: 0,
      summaryUz: "Jonli sham yetarli emas",
    };
  }
  const first = slice[0].close;
  const changeUsd = Math.round((livePrice - first) * 100) / 100;
  let bullishCloses = 0;
  let bearishCloses = 0;
  for (let i = 1; i < slice.length; i++) {
    if (slice[i].close > slice[i - 1].close) bullishCloses++;
    else if (slice[i].close < slice[i - 1].close) bearishCloses++;
  }
  const last = slice[slice.length - 1];
  if (last.close > last.open) bullishCloses++;
  else if (last.close < last.open) bearishCloses++;

  let direction: LiveMomentum["direction"] = "flat";
  if (changeUsd >= 0.22 || bullishCloses >= 3) direction = "up";
  else if (changeUsd <= -0.22 || bearishCloses >= 3) direction = "down";

  const summaryUz =
    direction === "up"
      ? `Jonli YUQORI: oxirgi sham +$${changeUsd} (${bullishCloses} ko'tarilish)`
      : direction === "down"
        ? `Jonli PAST: oxirgi sham $${changeUsd} (${bearishCloses} tushish)`
        : `Jonli FLAT: $${changeUsd} · kuting`;

  return { direction, changeUsd, bullishCloses, bearishCloses, summaryUz };
}

export function formatLiveMomentumForAi(m: LiveMomentum, changePercent: number): string {
  return `JONLI MOMENTUM (eng muhim — EMA dan ustun):
- ${m.summaryUz}
- 24s o'zgarish: ${changePercent}%
QOIDA: Jonli UP bo'lsa SELL taqiqlangan. Jonli DOWN bo'lsa BUY taqiqlangan.
ADX < 16 (range) — yangi savdo ochmang, HOLD.`;
}

export interface GuardResult {
  signal: AiTradeSignal;
  adjusted: boolean;
  reasonUz?: string;
}

export function guardScalpAiSignal(
  signal: AiTradeSignal,
  opts: {
    candles1m: Candle[];
    price: number;
    changePercent: number;
    tech1: TechnicalAnalysis;
    m1Scalp: M1ScalpLead | null;
    impulse: PriceImpulse | null;
    mode?: "scalp" | "swing";
  }
): GuardResult {
  if (signal.action === "HOLD") return { signal, adjusted: false };

  const mode = opts.mode ?? "scalp";
  const live = getLiveMomentum(opts.candles1m, opts.price);
  const rsi = opts.tech1.rsi;
  const adx = opts.tech1.adx || 0;
  const reasons: string[] = [];

  // Qattiq qoida: past ADX = range — HOLD
  if (adx > 0 && adx < 15) {
    reasons.push(`ADX ${adx} past — range bozor`);
  }

  if (signal.action === "SELL") {
    // Dead zone tuzatildi: changeUsd bilan to'g'ridan-to'g'ri
    if (live.changeUsd >= (mode === "scalp" ? 0.22 : 0.45)) {
      reasons.push(`narx ko'tarilmoqda (+$${live.changeUsd})`);
    }
    if (mode === "scalp" && rsi < 38 && adx >= 18) {
      reasons.push(`RSI ${rsi} oversold + trend — short xavfli`);
    }
    if (opts.impulse?.direction === "long" && opts.impulse.moveUsd >= (mode === "scalp" ? 0.3 : 0.55)) {
      reasons.push(`jonli impuls yuqoriga $${opts.impulse.moveUsd}`);
    }
    if (mode === "scalp" && live.bullishCloses >= 3 && live.bearishCloses <= 1) {
      reasons.push("oxirgi M1 shamlar ko'proq yashil");
    }
  }

  if (signal.action === "BUY") {
    if (live.changeUsd <= (mode === "scalp" ? -0.22 : -0.45)) {
      reasons.push(`narx tushmoqda ($${live.changeUsd})`);
    }
    if (mode === "scalp" && rsi > 62 && adx >= 18) {
      reasons.push(`RSI ${rsi} yuqori — long kech`);
    }
    if (opts.impulse?.direction === "short" && opts.impulse.moveUsd >= (mode === "scalp" ? 0.3 : 0.55)) {
      reasons.push(`jonli impuls pastga $${opts.impulse.moveUsd}`);
    }
    if (mode === "scalp" && live.bearishCloses >= 3 && live.bullishCloses <= 1) {
      reasons.push("oxirgi M1 shamlar qizil");
    }
  }

  if (opts.changePercent > (mode === "scalp" ? 0.4 : 0.8) && signal.action === "SELL") {
    reasons.push(`kunlik fon +${opts.changePercent}% — short qarshi`);
  }
  if (opts.changePercent < (mode === "scalp" ? -0.4 : -0.8) && signal.action === "BUY") {
    reasons.push(`kunlik fon ${opts.changePercent}% — long qarshi`);
  }

  // 1 qattiq sabab (ADX past yoki jonli qarshi) yoki 2+ sabab → HOLD
  const hard =
    reasons.some((r) => /ADX|ko'tarilmoqda|tushmoqda|impuls/.test(r));
  const need = mode === "scalp" ? (hard ? 1 : 2) : hard ? 1 : 2;
  if (reasons.length < need) return { signal, adjusted: false };

  const reasonUz = reasons.slice(0, 3).join("; ");
  return {
    adjusted: true,
    reasonUz,
    signal: {
      ...signal,
      action: "HOLD",
      confidence: Math.min(signal.confidence, 42),
      winProbability: Math.min(signal.winProbability ?? 50, 40),
      summaryUz: `HOLD — signal bekor: ${reasonUz}`,
      triggerUz: "Hozir kirmang — shartlar qarshi",
      analysisUz: `${signal.analysisUz}\n\n[Himoya] ${reasonUz}.`,
    },
  };
}
