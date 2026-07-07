/**
 * Ikki alohida confluence engine — har rejim uchun O'ZIGA XOS indikatorlar:
 *
 * SCALP (computeScalpConfluence) — tez intraday:
 *   EMA 8/20, RSI(7), Stochastic, mikro-momentum ROC(4), price-action
 *   mikro-struktura, qisqa breakout, VWAP og'ish, Bollinger bounce.
 *
 * SWING (computeConfluence) — trend + struktura:
 *   EMA 50/200 rejim, Supertrend, MACD, ADX/DMI, Ichimoku bulut,
 *   Donchian kanal, RSI(14), swing struktura (HH/HL).
 *
 * Har indikator long/short/neutral ovoz beradi; vaznli yig'indi bias va kuch.
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

/** Har bar uchun Wilder ATR seriyasi — bir martalik O(n) hisob */
function atrSeries(candles: Candle[], period = 14): number[] {
  const trs = trueRanges(candles);
  if (!trs.length) return [];
  const p = Math.min(period, trs.length);
  const smoothed = wilderSmooth(trs, p);
  // wilderSmooth (trs.length-p+1) ta qiymat qaytaradi; barlarga moslaymiz
  const pad = candles.length - smoothed.length;
  const out: number[] = new Array(candles.length).fill(smoothed[0] ?? 0);
  for (let i = 0; i < smoothed.length; i++) {
    const idx = pad + i;
    if (idx >= 0 && idx < out.length) out[idx] = smoothed[i];
  }
  return out;
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

// ══════════════════ SCALP indikatorlari (tez, intraday) ══════════════════

/** Tez EMA 8/20 kesishuv + qiyalik — scalp trend */
function voteScalpEma(closes: number[]): IndicatorVote {
  const e8 = ema(closes, 8);
  const e20 = ema(closes, 20);
  const e8prev = ema(closes.slice(0, -1), 8);
  const price = closes[closes.length - 1] ?? 0;
  const slopeUp = e8 > e8prev;
  let signal: VoteSignal = "neutral";
  let strength = 32;
  if (e8 > e20 && price > e8) {
    signal = "long";
    strength = slopeUp ? 72 : 58;
  } else if (e8 < e20 && price < e8) {
    signal = "short";
    strength = !slopeUp ? 72 : 58;
  } else if (e8 > e20) {
    signal = "long";
    strength = 48;
  } else if (e8 < e20) {
    signal = "short";
    strength = 48;
  }
  return {
    name: "EMA8/20",
    labelUz: `EMA 8/20 tez kesishuv (${signal === "long" ? "ko'tarilish" : signal === "short" ? "tushish" : "aralash"})`,
    signal,
    strength: Math.round(clamp(strength, 0, 100)),
    valueUz: `${round2(e8)}/${round2(e20)}`,
    weight: 1.5,
  };
}

/** RSI(7) — tez momentum + ekstremum reversion */
function voteFastRsi(closes: number[]): IndicatorVote {
  const r = rsiVal(closes, 7);
  let signal: VoteSignal = "neutral";
  let strength = 32;
  if (r >= 78) {
    signal = "short";
    strength = 64;
  } else if (r <= 22) {
    signal = "long";
    strength = 64;
  } else if (r > 56) {
    signal = "long";
    strength = 44 + Math.min(18, r - 56);
  } else if (r < 44) {
    signal = "short";
    strength = 44 + Math.min(18, 44 - r);
  }
  return {
    name: "RSI7",
    labelUz: `RSI(7) tez ${round2(r)}`,
    signal,
    strength: Math.round(clamp(strength, 0, 100)),
    valueUz: `${round2(r)}`,
    weight: 1.1,
  };
}

/** Mikro-momentum ROC(4) — sof tezlik */
function voteScalpRoc(closes: number[]): IndicatorVote {
  const period = Math.min(4, closes.length - 1);
  if (period < 2) {
    return { name: "ROC4", labelUz: "Mikro-momentum (kam)", signal: "neutral", strength: 20, valueUz: "—", weight: 1.2 };
  }
  const prev = closes[closes.length - 1 - period];
  const cur = closes[closes.length - 1];
  const roc = ((cur - prev) / prev) * 100;
  let signal: VoteSignal = "neutral";
  if (roc > 0.03) signal = "long";
  else if (roc < -0.03) signal = "short";
  const strength = signal === "neutral" ? 28 : Math.round(clamp(46 + Math.abs(roc) * 40, 40, 92));
  return {
    name: "ROC4",
    labelUz: `Mikro-momentum ROC(4) ${round2(roc)}%`,
    signal,
    strength,
    valueUz: `${round2(roc)}%`,
    weight: 1.2,
  };
}

/** Mikro-struktura — oxirgi 4 sham tanasi + pin-bar rad etish (price action) */
function voteMicroStructure(candles: Candle[]): IndicatorVote {
  const last = candles.slice(-4);
  if (last.length < 3) {
    return { name: "PA", labelUz: "Mikro-struktura (kam)", signal: "neutral", strength: 20, valueUz: "—", weight: 1.2 };
  }
  let up = 0;
  let down = 0;
  let bodyU = 0;
  let bodyD = 0;
  for (const c of last) {
    if (c.close > c.open) {
      up++;
      bodyU += c.close - c.open;
    } else {
      down++;
      bodyD += c.open - c.close;
    }
  }
  const lc = last[last.length - 1];
  const range = Math.max(lc.high - lc.low, 0.01);
  const upperWick = lc.high - Math.max(lc.open, lc.close);
  const lowerWick = Math.min(lc.open, lc.close) - lc.low;
  let signal: VoteSignal = "neutral";
  let strength = 34;
  if (up > down && bodyU > bodyD) {
    signal = "long";
    strength = 54 + Math.min(20, up * 4);
  } else if (down > up && bodyD > bodyU) {
    signal = "short";
    strength = 54 + Math.min(20, down * 4);
  }
  // Pin-bar rad etish ustun
  if (lowerWick > range * 0.6 && lowerWick > upperWick) {
    signal = "long";
    strength = Math.max(strength, 66);
  } else if (upperWick > range * 0.6 && upperWick > lowerWick) {
    signal = "short";
    strength = Math.max(strength, 66);
  }
  return {
    name: "PA",
    labelUz: `Mikro-struktura (${signal === "long" ? "bullish push" : signal === "short" ? "bearish push" : "aralash"})`,
    signal,
    strength: Math.round(clamp(strength, 0, 100)),
    valueUz: `${up}▲/${down}▼`,
    weight: 1.2,
  };
}

/** Qisqa breakout — oxirgi N-bar yuqori/quyi sindirish (momentum) */
function voteScalpBreakout(candles: Candle[]): IndicatorVote {
  const n = Math.min(15, candles.length - 1);
  if (n < 5) {
    return { name: "Breakout", labelUz: "Breakout (kam)", signal: "neutral", strength: 20, valueUz: "—", weight: 1.1 };
  }
  const prior = candles.slice(-n - 1, -1);
  const hh = Math.max(...prior.map((c) => c.high));
  const ll = Math.min(...prior.map((c) => c.low));
  const price = candles[candles.length - 1].close;
  let signal: VoteSignal = "neutral";
  let strength = 30;
  if (price > hh) {
    signal = "long";
    strength = 68;
  } else if (price < ll) {
    signal = "short";
    strength = 68;
  } else {
    const pos = (price - ll) / Math.max(hh - ll, 0.01);
    if (pos > 0.7) {
      signal = "long";
      strength = 46;
    } else if (pos < 0.3) {
      signal = "short";
      strength = 46;
    }
  }
  return {
    name: "Breakout",
    labelUz: `Breakout ${n}-bar (${signal === "long" ? "yuqoriga" : signal === "short" ? "pastga" : "kanal ichida"})`,
    signal,
    strength,
    valueUz: `H${round2(hh)}/L${round2(ll)}`,
    weight: 1.1,
  };
}

/** VWAP proksi — jonli anchor'dan og'ish (ATR birligida) */
function voteVwapProxy(candles: Candle[]): IndicatorVote {
  const n = Math.min(30, candles.length);
  const slice = candles.slice(-n);
  const tp = slice.map((c) => (c.high + c.low + c.close) / 3);
  const vwap = tp.reduce((a, b) => a + b, 0) / tp.length;
  const price = candles[candles.length - 1].close;
  const a = atr(candles) || 0.01;
  const dev = (price - vwap) / a;
  let signal: VoteSignal = "neutral";
  let strength = 32;
  if (dev > 2.2) {
    signal = "short";
    strength = 58;
  } else if (dev < -2.2) {
    signal = "long";
    strength = 58;
  } else if (dev > 0.2) {
    signal = "long";
    strength = 46;
  } else if (dev < -0.2) {
    signal = "short";
    strength = 46;
  }
  return {
    name: "VWAP",
    labelUz: `VWAP og'ish ${dev > 0 ? "+" : ""}${round2(dev)} ATR`,
    signal,
    strength,
    valueUz: `VWAP ${round2(vwap)}`,
    weight: 1.0,
  };
}

// ══════════════════ SWING indikatorlari (trend + struktura) ══════════════════

/** EMA 50/200 rejim — golden/death cross (uzoq trend) */
function voteRegimeEma(closes: number[]): IndicatorVote {
  const e50 = ema(closes, Math.min(50, closes.length));
  const e200 = ema(closes, Math.min(200, closes.length));
  const price = closes[closes.length - 1] ?? 0;
  const gap = (Math.abs(e50 - e200) / Math.max(e200, 1)) * 100;
  let signal: VoteSignal = "neutral";
  let strength = 34;
  if (e50 > e200 && price > e50) {
    signal = "long";
    strength = 68 + clamp(gap * 8, 0, 24);
  } else if (e50 < e200 && price < e50) {
    signal = "short";
    strength = 68 + clamp(gap * 8, 0, 24);
  } else if (price > e200) {
    signal = "long";
    strength = 50;
  } else if (price < e200) {
    signal = "short";
    strength = 50;
  }
  return {
    name: "EMA50/200",
    labelUz: `EMA 50/200 rejim (${signal === "long" ? "golden ko'tarilish" : signal === "short" ? "death tushish" : "aralash"})`,
    signal,
    strength: Math.round(clamp(strength, 0, 100)),
    valueUz: `${round2(e50)}/${round2(e200)}`,
    weight: 1.6,
  };
}

/** Ichimoku bulut — Tenkan/Kijun + Kumo (klassik swing) */
function voteIchimoku(candles: Candle[]): IndicatorVote {
  if (candles.length < 10) {
    return { name: "Ichimoku", labelUz: "Ichimoku (kam)", signal: "neutral", strength: 20, valueUz: "—", weight: 1.4 };
  }
  const hilo = (n: number) => {
    const s = candles.slice(-Math.min(n, candles.length));
    return (Math.max(...s.map((c) => c.high)) + Math.min(...s.map((c) => c.low))) / 2;
  };
  const tenkan = hilo(9);
  const kijun = hilo(26);
  const spanA = (tenkan + kijun) / 2;
  const spanB = hilo(52);
  const price = candles[candles.length - 1].close;
  const cloudTop = Math.max(spanA, spanB);
  const cloudBot = Math.min(spanA, spanB);
  let signal: VoteSignal = "neutral";
  let strength = 34;
  if (price > cloudTop && tenkan > kijun) {
    signal = "long";
    strength = 72;
  } else if (price < cloudBot && tenkan < kijun) {
    signal = "short";
    strength = 72;
  } else if (price > cloudTop) {
    signal = "long";
    strength = 54;
  } else if (price < cloudBot) {
    signal = "short";
    strength = 54;
  } else {
    signal = tenkan > kijun ? "long" : tenkan < kijun ? "short" : "neutral";
    strength = 40;
  }
  return {
    name: "Ichimoku",
    labelUz: `Ichimoku bulut (${signal === "long" ? "bulut ustida" : signal === "short" ? "bulut ostida" : "bulut ichida"})`,
    signal,
    strength: Math.round(clamp(strength, 0, 100)),
    valueUz: `T${round2(tenkan)}/K${round2(kijun)}`,
    weight: 1.4,
  };
}

/** Donchian kanal (turtle) — N-bar breakout */
function voteDonchian(candles: Candle[]): IndicatorVote {
  const n = Math.min(20, candles.length - 1);
  if (n < 6) {
    return { name: "Donchian", labelUz: "Donchian (kam)", signal: "neutral", strength: 20, valueUz: "—", weight: 1.2 };
  }
  const prior = candles.slice(-n - 1, -1);
  const hh = Math.max(...prior.map((c) => c.high));
  const ll = Math.min(...prior.map((c) => c.low));
  const mid = (hh + ll) / 2;
  const price = candles[candles.length - 1].close;
  let signal: VoteSignal = "neutral";
  let strength = 32;
  if (price >= hh) {
    signal = "long";
    strength = 70;
  } else if (price <= ll) {
    signal = "short";
    strength = 70;
  } else if (price > mid) {
    signal = "long";
    strength = 46;
  } else if (price < mid) {
    signal = "short";
    strength = 46;
  }
  return {
    name: "Donchian",
    labelUz: `Donchian ${n} kanal (${signal === "long" ? "yuqori breakout" : signal === "short" ? "quyi breakout" : "kanalda"})`,
    signal,
    strength,
    valueUz: `H${round2(hh)}/L${round2(ll)}`,
    weight: 1.2,
  };
}

/** Swing struktura — HH/HL vs LH/LL (bozor tuzilishi) */
function voteSwingStructure(candles: Candle[]): IndicatorVote {
  if (candles.length < 16) {
    return { name: "Struktura", labelUz: "Swing struktura (kam)", signal: "neutral", strength: 24, valueUz: "—", weight: 1.3 };
  }
  const seg = candles.slice(-40);
  const half = Math.floor(seg.length / 2);
  const firstH = Math.max(...seg.slice(0, half).map((c) => c.high));
  const lastH = Math.max(...seg.slice(half).map((c) => c.high));
  const firstL = Math.min(...seg.slice(0, half).map((c) => c.low));
  const lastL = Math.min(...seg.slice(half).map((c) => c.low));
  const hh = lastH > firstH;
  const hl = lastL > firstL;
  const lh = lastH < firstH;
  const ll = lastL < firstL;
  let signal: VoteSignal = "neutral";
  let strength = 36;
  if (hh && hl) {
    signal = "long";
    strength = 66;
  } else if (lh && ll) {
    signal = "short";
    strength = 66;
  } else if (hh || hl) {
    signal = "long";
    strength = 48;
  } else if (lh || ll) {
    signal = "short";
    strength = 48;
  }
  return {
    name: "Struktura",
    labelUz: `Swing struktura (${signal === "long" ? "HH/HL ko'tarilish" : signal === "short" ? "LH/LL tushish" : "diapazon"})`,
    signal,
    strength: Math.round(clamp(strength, 0, 100)),
    valueUz: `H${round2(lastH)}/L${round2(lastL)}`,
    weight: 1.3,
  };
}

function voteSupertrend(candles: Candle[]): IndicatorVote {
  const period = 10;
  const mult = 3;
  const price = candles[candles.length - 1]?.close ?? 0;
  if (candles.length < period + 2) {
    return { name: "Supertrend", labelUz: "Supertrend (ma'lumot kam)", signal: "neutral", strength: 20, valueUz: "—", weight: 1.4 };
  }
  // O(n) yagona o'tish — ATR seriyasi oldindan hisoblangan
  const atrs = atrSeries(candles, period);
  let finalUpper = 0;
  let finalLower = 0;
  let trendUp = true;
  for (let i = 1; i < candles.length; i++) {
    const at = atrs[i] || atrs[atrs.length - 1] || 0.01;
    const mid = (candles[i].high + candles[i].low) / 2;
    const basicUpper = mid + mult * at;
    const basicLower = mid - mult * at;
    const prevClose = candles[i - 1].close;
    finalUpper =
      i === 1 ? basicUpper : basicUpper < finalUpper || prevClose > finalUpper ? basicUpper : finalUpper;
    finalLower =
      i === 1 ? basicLower : basicLower > finalLower || prevClose < finalLower ? basicLower : finalLower;
    if (candles[i].close > finalUpper) trendUp = true;
    else if (candles[i].close < finalLower) trendUp = false;
  }
  const a = atrs[atrs.length - 1] || 0.01;
  const line = trendUp ? finalLower : finalUpper;
  const dist = Math.abs(price - line) / Math.max(a, 0.01);
  const signal: VoteSignal = trendUp ? "long" : "short";
  const strength = Math.round(clamp(52 + dist * 12, 40, 92));
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
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
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

/** Ovozlarni vaznli yig'ib ConfluenceResult qurish (umumiy yadro) */
function tallyVotes(
  votes: IndicatorVote[],
  candles: Candle[],
  closes: number[],
  biasThreshold: number
): ConfluenceResult {
  let longW = 0;
  let shortW = 0;
  let weightSum = 0;
  for (const v of votes) {
    weightSum += v.weight;
    const contrib = v.weight * (v.strength / 100);
    if (v.signal === "long") longW += contrib;
    else if (v.signal === "short") shortW += contrib;
  }
  const longScore = weightSum ? Math.round((longW / weightSum) * 100) : 0;
  const shortScore = weightSum ? Math.round((shortW / weightSum) * 100) : 0;
  const score = longScore - shortScore;
  const bias: VoteSignal = score >= biasThreshold ? "long" : score <= -biasThreshold ? "short" : "neutral";
  const agree = votes.filter((v) => v.signal === bias && bias !== "neutral").length;
  const strength = Math.round(clamp(Math.abs(score) + agree * 3, 0, 100));
  const summaryUz = `Confluence ${bias === "long" ? "LONG" : bias === "short" ? "SHORT" : "NEYTRAL"} · L${longScore}/S${shortScore} · ${agree}/${votes.length} mos`;
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

/**
 * SCALP confluence — TEZ SAVDO uchun intraday indikatorlar:
 * EMA 8/20, RSI(7), Stochastic, mikro-momentum ROC(4), price-action
 * mikro-struktura, qisqa breakout, VWAP og'ish, Bollinger bounce.
 */
export function computeScalpConfluence(candles: Candle[]): ConfluenceResult {
  const closes = candles.map((c) => c.close);
  const votes: IndicatorVote[] = [
    voteScalpEma(closes),
    voteFastRsi(closes),
    voteStochastic(candles),
    voteScalpRoc(closes),
    voteMicroStructure(candles),
    voteScalpBreakout(candles),
    voteVwapProxy(candles),
    voteBollinger(closes),
  ];
  return tallyVotes(votes, candles, closes, 6);
}

/**
 * SWING confluence — UZOQ MUDDAT uchun trend + struktura indikatorlari:
 * EMA 50/200 rejim, Supertrend, MACD, ADX/DMI, Ichimoku bulut,
 * Donchian kanal, RSI(14), swing struktura (HH/HL).
 */
export function computeConfluence(candles: Candle[]): ConfluenceResult {
  const closes = candles.map((c) => c.close);
  const votes: IndicatorVote[] = [
    voteRegimeEma(closes),
    voteSupertrend(candles),
    voteMacd(closes),
    voteAdxDmi(candles),
    voteIchimoku(candles),
    voteDonchian(candles),
    voteRsi(closes),
    voteSwingStructure(candles),
  ];
  return tallyVotes(votes, candles, closes, 5);
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
