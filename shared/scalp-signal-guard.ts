/**
 * M1 skalp — AI signalini jonli narx bilan tekshirish.
 * Faqat HAQIQIY qarama-qarshilikda HOLD; past ADX → foiz pasayadi (HOLD emas).
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
  if (changeUsd >= 0.28 || bullishCloses >= 3) direction = "up";
  else if (changeUsd <= -0.28 || bearishCloses >= 3) direction = "down";

  const summaryUz =
    direction === "up"
      ? `Jonli YUQORI: oxirgi sham +$${changeUsd} (${bullishCloses} ko'tarilish)`
      : direction === "down"
        ? `Jonli PAST: oxirgi sham $${changeUsd} (${bearishCloses} tushish)`
        : `Jonli FLAT: $${changeUsd} · kuzatish`;

  return { direction, changeUsd, bullishCloses, bearishCloses, summaryUz };
}

export function formatLiveMomentumForAi(m: LiveMomentum, changePercent: number): string {
  return `JONLI MOMENTUM:
- ${m.summaryUz}
- 24s o'zgarish: ${changePercent}%
QOIDA: Jonli kuchli UP bo'lsa SELL xavfli. Jonli kuchli DOWN bo'lsa BUY xavfli.
ADX past bo'lsa — ishonchni pasaytiring, lekin avtomatik HOLD qilmang.`;
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

  if (signal.action === "SELL") {
    if (live.changeUsd >= (mode === "scalp" ? 0.35 : 0.6)) {
      reasons.push(`narx ko'tarilmoqda (+$${live.changeUsd})`);
    }
    if (opts.impulse?.direction === "long" && opts.impulse.moveUsd >= (mode === "scalp" ? 0.45 : 0.7)) {
      reasons.push(`jonli impuls yuqoriga $${opts.impulse.moveUsd}`);
    }
    if (mode === "scalp" && live.bullishCloses >= 3 && live.bearishCloses === 0) {
      reasons.push("oxirgi M1 shamlar yashil");
    }
  }

  if (signal.action === "BUY") {
    if (live.changeUsd <= (mode === "scalp" ? -0.35 : -0.6)) {
      reasons.push(`narx tushmoqda ($${live.changeUsd})`);
    }
    if (opts.impulse?.direction === "short" && opts.impulse.moveUsd >= (mode === "scalp" ? 0.45 : 0.7)) {
      reasons.push(`jonli impuls pastga $${opts.impulse.moveUsd}`);
    }
    if (mode === "scalp" && live.bearishCloses >= 3 && live.bullishCloses === 0) {
      reasons.push("oxirgi M1 shamlar qizil");
    }
  }

  // Faqat 2+ jonli qarshi sabab → HOLD (ADX o'zi HOLD qilmaydi)
  if (reasons.length < 2) {
    // Past ADX — signalni saqlab, ishonchni pasaytirish
    if (adx > 0 && adx < 15 && (signal.winProbability ?? 50) > 58) {
      return {
        adjusted: true,
        reasonUz: `ADX ${adx} past — ishonch pasaytirildi`,
        signal: {
          ...signal,
          confidence: Math.min(signal.confidence, 55),
          winProbability: Math.min(signal.winProbability ?? 60, 56),
          signalGrade: "B",
          summaryUz: `${signal.action} — ~${Math.min(signal.winProbability ?? 60, 56)}% · B · ADX past (ehtiyot)`,
          analysisUz: `${signal.analysisUz}\n[Ehtiyot] ADX ${adx} past — range, kichik lot.`,
        },
      };
    }
    return { signal, adjusted: false };
  }

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
      triggerUz: "Hozir kirmang — jonli narx teskari",
      analysisUz: `${signal.analysisUz}\n\n[Himoya] ${reasonUz}.`,
    },
  };
}
