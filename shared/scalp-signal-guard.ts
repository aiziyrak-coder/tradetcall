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
  if (changeUsd >= 0.35 || bullishCloses >= 3) direction = "up";
  else if (changeUsd <= -0.35 || bearishCloses >= 3) direction = "down";

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
RSI < 38 oversold — SELL emas, BUY yoki HOLD. RSI > 62 overbought — BUY emas, SELL yoki HOLD.`;
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
  }
): GuardResult {
  if (signal.action === "HOLD") return { signal, adjusted: false };

  const live = getLiveMomentum(opts.candles1m, opts.price);
  const rsi = opts.tech1.rsi;
  const reasons: string[] = [];

  if (signal.action === "SELL") {
    if (live.direction === "up" && live.changeUsd >= 0.25) {
      reasons.push(`narx hozir ko'tarilmoqda (+$${live.changeUsd})`);
    }
    if (rsi < 42) reasons.push(`RSI ${rsi} oversold — pastga sotish xavfli`);
    if (opts.impulse?.direction === "long" && opts.impulse.moveUsd >= 0.35) {
      reasons.push(`jonli impuls yuqoriga $${opts.impulse.moveUsd}`);
    }
    if (opts.m1Scalp?.phase === "exhausted" || opts.m1Scalp?.phase === "reversal") {
      reasons.push(`M1 faza: ${opts.m1Scalp.phase}`);
    }
    if (live.bullishCloses >= 3 && live.bearishCloses <= 1) {
      reasons.push("oxirgi M1 shamlar ko'proq yashil");
    }
  }

  if (signal.action === "BUY") {
    if (live.direction === "down" && live.changeUsd <= -0.25) {
      reasons.push(`narx hozir tushmoqda ($${live.changeUsd})`);
    }
    if (rsi > 58) reasons.push(`RSI ${rsi} yuqori — sotib olish kech`);
    if (opts.impulse?.direction === "short" && opts.impulse.moveUsd >= 0.35) {
      reasons.push(`jonli impuls pastga $${opts.impulse.moveUsd}`);
    }
    if (opts.m1Scalp?.phase === "exhausted" || opts.m1Scalp?.phase === "reversal") {
      reasons.push(`M1 faza: ${opts.m1Scalp.phase}`);
    }
    if (live.bearishCloses >= 3 && live.bullishCloses <= 1) {
      reasons.push("oxirgi M1 shamlar qizil");
    }
  }

  if (opts.changePercent > 0.45 && signal.action === "SELL") {
    reasons.push(`kunlik fon +${opts.changePercent}% — short qarshi`);
  }
  if (opts.changePercent < -0.45 && signal.action === "BUY") {
    reasons.push(`kunlik fon ${opts.changePercent}% — long qarshi`);
  }

  // Yumshoq — faqat kuchli qarama-qarshilikda HOLD ga aylantiriladi
  if (reasons.length === 0) return { signal, adjusted: false };
  if (reasons.length === 1) return { signal, adjusted: false };
  if (reasons.length === 2 && signal.confidence >= 50) return { signal, adjusted: false };
  if (reasons.length === 3 && signal.confidence >= 66) return { signal, adjusted: false };

  const reasonUz = reasons.slice(0, 3).join("; ");
  return {
    adjusted: true,
    reasonUz,
    signal: {
      ...signal,
      action: "HOLD",
      confidence: Math.min(signal.confidence, 48),
      summaryUz: `HOLD — signal bekor: ${reasonUz}`,
      triggerUz: "Hozir kirmang — jonli narx teskari yurmoqda",
      analysisUz: `${signal.analysisUz}\n\n[Himoya] ${reasonUz}. Yangi prognoz — trend tasdiqlangach.`,
    },
  };
}
