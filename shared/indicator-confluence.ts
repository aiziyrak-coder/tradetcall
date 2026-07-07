/**
 * Top-10 indikator confluence engine — professional signal yadrosi
 *
 * Indikatorlar: EMA ribbon, Supertrend, MACD, RSI, Stochastic,
 * ADX/DMI, Bollinger %B, CCI, ROC (momentum), SMA/struktura + hajm.
 * Har biri long/short/neutral ovoz beradi; vaznli yig'indi bias va kuch.
 */

import type { Candle } from "./types";

export type VoteSignal = "long" | "short" | "neutral";

export interface IndicatorVote {
  name: string;
  labelUz: string;
  signal: VoteSignal;
  /** 0–100 — ushbu indikator qanchalik qat'iy */
  strength: number;
  valueUz: string;
  weight: number;
}

export interface ConfluenceResult {
  bias: VoteSignal;
  /** -100..100 (long musbat) */
  score: number;
  longScore: number;
  shortScore: number;
  /** 0..100 umumiy ishonch */
  strength: number;
  agree: number;
  total: number;
  votes: IndicatorVote[];
  summaryUz: string;
  atr: number;
  rsi: number;
  adx: number;
  ema50: number;
  ema200: number;
}

// ── Yordamchi matematik funksiyalar ──

function emaSeries(values: number[], period: number): number[] {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

function ema(values: number[], period: number): number {
  const s = emaSeries(values, period);
  return s[s.length - 1] ?? 0;
}

function sma(values: number[], period: number): number {
  if (!values.length) return 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function stdev(values: number[], period: number): number {
  const slice = values.slice(-period);
  if (!slice.length) return 0;
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const v = slice.reduce((a, c) => a + (c - mean) ** 2, 0) / slice.length;
  return Math.sqrt(v);
}

function trueRanges(candles: Candle[]): number[] {
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(
      Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close)
      )
    );
  }
  return trs;
}

function wilderSmooth(values: number[], period: number): number[] {
  if (values.length < period) return values.slice();
  let v = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const out: number[] = [v];
  for (let i = period; i < values.length; i++) {
    v = (v * (period - 1) + values[i]) / period;
    out.push(v);
  }
  return out;
}

function atr(candles: Candle[], period = 14): number {
  const trs = trueRanges(candles);
  if (!trs.length) return 0;
  const s = wilderSmooth(trs, Math.min(period, trs.length));
  return s[s.length - 1] ?? 0;
}

function rsiVal(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ── Indikator ovozlari ──

function voteEmaRibbon(closes: number[]): IndicatorVote {
  const e9 = ema(closes, 9);
  const e21 = ema(closes, 21);
  const e50 = ema(closes, Math.min(50, closes.length));
  const price = closes[closes.length - 1] ?? 0;
  let signal: VoteSignal = "neutral";
  let strength = 30;
  if (e9 > e21 && e21 > e50 && price > e9) {
    signal = "long";
    strength = 70 + clamp((e9 - e50) / Math.max(e50, 1) * 4000, 0, 30);
  } else if (e9 < e21 && e21 < e50 && price < e9) {
    signal = "short";
    strength = 70 + clamp((e50 - e9) / Math.max(e50, 1) * 4000, 0, 30);
  } else if (e9 > e21 && price > e21) {
    signal = "long";
    strength = 52;
  } else if (e9 < e21 && price < e21) {
    signal = "short";
    strength = 52;
  }
  return {
    name: "EMA",
    labelUz: `EMA lenta 9/21/50 (${signal === "long" ? "ko'tarilish" : signal === "short" ? "tushish" : "aralash"})`,
    signal,
    strength: Math.round(clamp(strength, 0, 100)),
    valueUz: `${round2(e9)}/${round2(e21)}/${round2(e50)}`,
    weight: 1.4,
  };
}

function voteSupertrend(candles: Candle[]): IndicatorVote {
  const period = 10;
  const mult = 3;
  const a = atr(candles, period);
  const price = candles[candles.length - 1]?.close ?? 0;
  if (!a || candles.length < period + 2) {
    return { name: "Supertrend", labelUz: "Supertrend (ma'lumot kam)", signal: "neutral", strength: 20, valueUz: "—", weight: 1.4 };
  }
  // Soddalashtirilgan supertrend — oxirgi qiymat
  let upper = 0;
  let lower = 0;
  let trendUp = true;
  for (let i = period; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const at = atr(slice, period);
    const mid = (candles[i].high + candles[i].low) / 2;
    const basicUpper = mid + mult * at;
    const basicLower = mid - mult * at;
    upper = i === period ? basicUpper : basicUpper < upper || candles[i - 1].close > upper ? basicUpper : upper;
    lower = i === period ? basicLower : basicLower > lower || candles[i - 1].close < lower ? basicLower : lower;
    if (candles[i].close > upper) trendUp = true;
    else if (candles[i].close < lower) trendUp = false;
  }
  const line = trendUp ? lower : upper;
  const dist = Math.abs(price - line) / Math.max(a, 0.01);
  const signal: VoteSignal = trendUp ? "long" : "short";
  const strength = Math.round(clamp(55 + dist * 15, 40, 95));
  return {
    name: "Supertrend",
    labelUz: `Supertrend (${trendUp ? "long" : "short"})`,
    signal,
    strength,
    valueUz: `chiziq ${round2(line)}`,
    weight: 1.4,
  };
}

function voteMacd(closes: number[]): IndicatorVote {
  const macdLine = emaSeries(closes, 12).map((v, i) => v - emaSeries(closes, 26)[i]);
  const macd = macdLine[macdLine.length - 1] ?? 0;
  const signalLine = emaSeries(macdLine.slice(-Math.min(35, macdLine.length)), 9);
  const sig = signalLine[signalLine.length - 1] ?? 0;
  const hist = macd - sig;
  let signal: VoteSignal = "neutral";
  if (hist > 0.05) signal = "long";
  else if (hist < -0.05) signal = "short";
  const strength = Math.round(clamp(45 + Math.abs(hist) * 40, 30, 95));
  return {
    name: "MACD",
    labelUz: `MACD (hist ${round2(hist)})`,
    signal,
    strength: signal === "neutral" ? 30 : strength,
    valueUz: `${round2(macd)}/${round2(sig)}`,
    weight: 1.2,
  };
}

function voteRsi(closes: number[]): IndicatorVote {
  const r = rsiVal(closes);
  let signal: VoteSignal = "neutral";
  let strength = 35;
  if (r >= 70) {
    signal = "short";
    strength = 60 + clamp((r - 70) * 2, 0, 30);
  } else if (r <= 30) {
    signal = "long";
    strength = 60 + clamp((30 - r) * 2, 0, 30);
  } else if (r > 55) {
    signal = "long";
    strength = 45 + (r - 55);
  } else if (r < 45) {
    signal = "short";
    strength = 45 + (45 - r);
  }
  return {
    name: "RSI",
    labelUz: `RSI ${round2(r)}`,
    signal,
    strength: Math.round(clamp(strength, 0, 100)),
    valueUz: `${round2(r)}`,
    weight: 1.0,
  };
}

function voteStochastic(candles: Candle[]): IndicatorVote {
  const period = 14;
  if (candles.length < period + 3) {
    return { name: "Stochastic", labelUz: "Stochastic (kam)", signal: "neutral", strength: 20, valueUz: "—", weight: 0.9 };
  }
  const ks: number[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const hh = Math.max(...slice.map((c) => c.high));
    const ll = Math.min(...slice.map((c) => c.low));
    const c = candles[i].close;
    ks.push(hh === ll ? 50 : ((c - ll) / (hh - ll)) * 100);
  }
  const k = ks[ks.length - 1] ?? 50;
  const d = sma(ks, 3);
  let signal: VoteSignal = "neutral";
  let strength = 35;
  if (k < 20 && k > d) {
    signal = "long";
    strength = 65;
  } else if (k > 80 && k < d) {
    signal = "short";
    strength = 65;
  } else if (k > d && k > 50) {
    signal = "long";
    strength = 48;
  } else if (k < d && k < 50) {
    signal = "short";
    strength = 48;
  }
  return {
    name: "Stochastic",
    labelUz: `Stochastic %K ${Math.round(k)}`,
    signal,
    strength,
    valueUz: `K${Math.round(k)}/D${Math.round(d)}`,
    weight: 0.9,
  };
}

function voteAdxDmi(candles: Candle[]): IndicatorVote {
  const period = 14;
  if (candles.length < period + 3) {
    return { name: "ADX", labelUz: "ADX/DMI (kam)", signal: "neutral", strength: 20, valueUz: "—", weight: 1.3 };
  }
  const plusDm: number[] = [];
  const minusDm: number[] = [];
  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    plusDm.push(up > down && up > 0 ? up : 0);
    minusDm.push(down > up && down > 0 ? down : 0);
    const c = candles[i];
    const prev = candles[i - 1];
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
  }
  const trS = wilderSmooth(tr, period);
  const plusS = wilderSmooth(plusDm, period);
  const minusS = wilderSmooth(minusDm, period);
  const n = trS.length - 1;
  const trv = trS[n] || 1;
  const pdi = (100 * (plusS[n] ?? 0)) / trv;
  const mdi = (100 * (minusS[n] ?? 0)) / trv;
  const dx: number[] = [];
  for (let i = 0; i < trS.length; i++) {
    const t = trS[i] || 1;
    const p = (100 * (plusS[i] ?? 0)) / t;
    const m = (100 * (minusS[i] ?? 0)) / t;
    const sum = p + m;
    if (sum > 0) dx.push((100 * Math.abs(p - m)) / sum);
  }
  const adxVal = dx.length ? sma(dx, Math.min(period, dx.length)) : 0;
  let signal: VoteSignal = "neutral";
  if (adxVal >= 18) {
    if (pdi > mdi) signal = "long";
    else if (mdi > pdi) signal = "short";
  }
  const strength = signal === "neutral" ? 30 : Math.round(clamp(40 + adxVal, 40, 95));
  return {
    name: "ADX",
    labelUz: `ADX ${Math.round(adxVal)} (+DI ${Math.round(pdi)}/-DI ${Math.round(mdi)})`,
    signal,
    strength,
    valueUz: `ADX ${Math.round(adxVal)}`,
    weight: 1.3,
  };
}

function voteBollinger(closes: number[]): IndicatorVote {
  const period = Math.min(20, closes.length);
  const mid = sma(closes, period);
  const sd = stdev(closes, period) || 0.0001;
  const price = closes[closes.length - 1] ?? mid;
  const upper = mid + 2 * sd;
  const lower = mid - 2 * sd;
  const pctB = ((price - lower) / (upper - lower)) * 100;
  let signal: VoteSignal = "neutral";
  let strength = 30;
  if (pctB <= 5) {
    signal = "long";
    strength = 62;
  } else if (pctB >= 95) {
    signal = "short";
    strength = 62;
  } else if (pctB > 55) {
    signal = "long";
    strength = 42;
  } else if (pctB < 45) {
    signal = "short";
    strength = 42;
  }
  return {
    name: "Bollinger",
    labelUz: `Bollinger %B ${Math.round(pctB)}%`,
    signal,
    strength: Math.round(clamp(strength, 0, 100)),
    valueUz: `%B ${Math.round(pctB)}`,
    weight: 0.9,
  };
}

function voteCci(candles: Candle[]): IndicatorVote {
  const period = Math.min(20, candles.length);
  if (candles.length < 5) {
    return { name: "CCI", labelUz: "CCI (kam)", signal: "neutral", strength: 20, valueUz: "—", weight: 0.9 };
  }
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  const slice = tp.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const meanDev = slice.reduce((a, c) => a + Math.abs(c - mean), 0) / slice.length || 0.0001;
  const cci = (tp[tp.length - 1] - mean) / (0.015 * meanDev);
  let signal: VoteSignal = "neutral";
  let strength = 32;
  if (cci > 100) {
    signal = "long";
    strength = 58 + clamp((cci - 100) / 5, 0, 30);
  } else if (cci < -100) {
    signal = "short";
    strength = 58 + clamp((-100 - cci) / 5, 0, 30);
  } else if (cci > 20) {
    signal = "long";
    strength = 44;
  } else if (cci < -20) {
    signal = "short";
    strength = 44;
  }
  return {
    name: "CCI",
    labelUz: `CCI ${Math.round(cci)}`,
    signal,
    strength: Math.round(clamp(strength, 0, 100)),
    valueUz: `${Math.round(cci)}`,
    weight: 0.9,
  };
}

function voteRoc(closes: number[]): IndicatorVote {
  const period = Math.min(10, closes.length - 1);
  if (period < 2) {
    return { name: "ROC", labelUz: "ROC (kam)", signal: "neutral", strength: 20, valueUz: "—", weight: 1.0 };
  }
  const prev = closes[closes.length - 1 - period];
  const cur = closes[closes.length - 1];
  const roc = ((cur - prev) / prev) * 100;
  let signal: VoteSignal = "neutral";
  if (roc > 0.05) signal = "long";
  else if (roc < -0.05) signal = "short";
  const strength = signal === "neutral" ? 30 : Math.round(clamp(45 + Math.abs(roc) * 30, 40, 92));
  return {
    name: "ROC",
    labelUz: `Momentum (ROC ${round2(roc)}%)`,
    signal,
    strength,
    valueUz: `${round2(roc)}%`,
    weight: 1.0,
  };
}

function voteStructure(candles: Candle[], closes: number[]): IndicatorVote {
  const price = closes[closes.length - 1] ?? 0;
  const sma50 = sma(closes, Math.min(50, closes.length));
  const sma200 = sma(closes, Math.min(200, closes.length));
  const last6 = candles.slice(-6);
  let bull = 0;
  let bear = 0;
  for (const c of last6) {
    if (c.close > c.open) bull += Math.abs(c.close - c.open);
    else bear += Math.abs(c.close - c.open);
  }
  const aboveMa = price > sma50 && sma50 >= sma200;
  const belowMa = price < sma50 && sma50 <= sma200;
  let signal: VoteSignal = "neutral";
  let strength = 34;
  if (aboveMa && bull >= bear) {
    signal = "long";
    strength = 60;
  } else if (belowMa && bear >= bull) {
    signal = "short";
    strength = 60;
  } else if (price > sma50) {
    signal = "long";
    strength = 46;
  } else if (price < sma50) {
    signal = "short";
    strength = 46;
  }
  return {
    name: "Struktura",
    labelUz: `Narx SMA50 ${price > sma50 ? "ustida" : "ostida"} · tana ${bull >= bear ? "yashil" : "qizil"}`,
    signal,
    strength: Math.round(clamp(strength, 0, 100)),
    valueUz: `SMA50 ${round2(sma50)}`,
    weight: 1.2,
  };
}

/** Bitta timeframe uchun 10 indikator confluence */
export function computeConfluence(candles: Candle[]): ConfluenceResult {
  const closes = candles.map((c) => c.close);
  const votes: IndicatorVote[] = [
    voteEmaRibbon(closes),
    voteSupertrend(candles),
    voteMacd(closes),
    voteRsi(closes),
    voteStochastic(candles),
    voteAdxDmi(candles),
    voteBollinger(closes),
    voteCci(candles),
    voteRoc(closes),
    voteStructure(candles, closes),
  ];

  let longW = 0;
  let shortW = 0;
  let weightSum = 0;
  for (const v of votes) {
    weightSum += v.weight;
    const contrib = v.weight * (v.strength / 100);
    if (v.signal === "long") longW += contrib;
    else if (v.signal === "short") shortW += contrib;
  }
  const longScore = Math.round((longW / weightSum) * 100);
  const shortScore = Math.round((shortW / weightSum) * 100);
  const score = longScore - shortScore;
  const bias: VoteSignal = score >= 6 ? "long" : score <= -6 ? "short" : "neutral";
  const agree = votes.filter((v) => v.signal === bias && bias !== "neutral").length;
  const strength = Math.round(clamp(Math.abs(score) + agree * 3, 0, 100));

  const summaryUz = `Confluence ${bias === "long" ? "LONG" : bias === "short" ? "SHORT" : "NEYTRAL"} · L${longScore}/S${shortScore} · ${agree}/10 mos`;

  return {
    bias,
    score,
    longScore,
    shortScore,
    strength,
    agree,
    total: votes.length,
    votes,
    summaryUz,
    atr: round2(atr(candles)),
    rsi: round2(rsiVal(closes)),
    adx: 0,
    ema50: round2(ema(closes, Math.min(50, closes.length))),
    ema200: round2(sma(closes, Math.min(200, closes.length))),
  };
}

export interface TfConfluence {
  tf: string;
  weight: number;
  result: ConfluenceResult;
}

export interface MtfConfluence {
  score: number;
  longScore: number;
  shortScore: number;
  bias: VoteSignal;
  /** Necha TF bias bilan mos */
  alignedTf: number;
  totalTf: number;
  strength: number;
  perTf: TfConfluence[];
  topVotes: IndicatorVote[];
  summaryUz: string;
}

/** Ko'p timeframe confluence — uzoq muddat uchun yuqori TF ustun */
export function computeMtfConfluence(
  tfCandles: { tf: string; weight: number; candles: Candle[] }[]
): MtfConfluence {
  const perTf: TfConfluence[] = [];
  let longW = 0;
  let shortW = 0;
  let weightSum = 0;

  for (const { tf, weight, candles } of tfCandles) {
    if (!candles || candles.length < 6) continue;
    const result = computeConfluence(candles);
    perTf.push({ tf, weight, result });
    weightSum += weight;
    longW += weight * (result.longScore / 100);
    shortW += weight * (result.shortScore / 100);
  }

  if (!perTf.length || weightSum === 0) {
    return {
      score: 0,
      longScore: 0,
      shortScore: 0,
      bias: "neutral",
      alignedTf: 0,
      totalTf: 0,
      strength: 0,
      perTf: [],
      topVotes: [],
      summaryUz: "Ma'lumot yetarli emas",
    };
  }

  const longScore = Math.round((longW / weightSum) * 100);
  const shortScore = Math.round((shortW / weightSum) * 100);
  const score = longScore - shortScore;
  const bias: VoteSignal = score >= 5 ? "long" : score <= -5 ? "short" : "neutral";
  const alignedTf = perTf.filter((p) => p.result.bias === bias && bias !== "neutral").length;
  const strength = Math.round(clamp(Math.abs(score) + alignedTf * 6, 0, 100));

  // Eng kuchli 6 ovoz (bias tomonida)
  const allVotes = perTf.flatMap((p) =>
    p.result.votes.map((v) => ({ ...v, labelUz: `${p.tf}: ${v.labelUz}` }))
  );
  const topVotes = allVotes
    .filter((v) => v.signal === bias && bias !== "neutral")
    .sort((a, b) => b.strength * b.weight - a.strength * a.weight)
    .slice(0, 6);

  const summaryUz = `MTF ${bias === "long" ? "LONG" : bias === "short" ? "SHORT" : "NEYTRAL"} · L${longScore}/S${shortScore} · ${alignedTf}/${perTf.length} TF mos`;

  return {
    score,
    longScore,
    shortScore,
    bias,
    alignedTf,
    totalTf: perTf.length,
    strength,
    perTf,
    topVotes,
    summaryUz,
  };
}

/** 1h shamlardan yuqori TF (4h, 1d) yasash */
export function aggregateCandles(candles: Candle[], factor: number): Candle[] {
  if (factor <= 1 || candles.length < factor) return candles.slice();
  const out: Candle[] = [];
  for (let i = 0; i + factor <= candles.length; i += factor) {
    const group = candles.slice(i, i + factor);
    out.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
    });
  }
  return out;
}
