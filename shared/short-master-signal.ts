/**
 * Qisqa muddat — barcha indikator, TF, yangilik, makro, impuls
 * professional panel ovoz berish → yakuniy BUY/SELL/HOLD
 */

import type { ChartInterval } from "./chart";
import type {
  Candle,
  MarketQuote,
  NewsMarketAnalysis,
  TechnicalAnalysis,
} from "./types";
import { analyzeTechnicals } from "./technical";
import type { PriceImpulse } from "./price-impulse";
import type { MarketRegime } from "./market-regime";
import type { CalendarStatus } from "./calendar-types";
import type { MarketSessionInfo } from "./market-session";

export interface TraderVote {
  traderUz: string;
  side: "long" | "short" | "neutral";
  weight: number;
  noteUz: string;
}

export interface SignalPillar {
  labelUz: string;
  longPts: number;
  shortPts: number;
  noteUz: string;
}

export interface ShortMasterSignal {
  bias: "long" | "short" | "wait";
  longScore: number;
  shortScore: number;
  confidence: number;
  confluencePct: number;
  pillars: SignalPillar[];
  votes: TraderVote[];
  summaryUz: string;
  panelUz: string;
}

const TF_WEIGHT: Record<string, number> = {
  "1m": 1.2,
  "5m": 2,
  "15m": 2.5,
  "1h": 3,
};

function emaLast(closes: number[], period: number): number {
  if (!closes.length) return 0;
  const k = 2 / (period + 1);
  let v = closes[0];
  for (let i = 1; i < closes.length; i++) v = closes[i] * k + v * (1 - k);
  return v;
}

function macdSide(closes: number[]): "long" | "short" | "neutral" {
  if (closes.length < 30) return "neutral";
  const fast = emaLast(closes, 12);
  const slow = emaLast(closes, 26);
  const diff = fast - slow;
  if (diff > 0.05) return "long";
  if (diff < -0.05) return "short";
  return "neutral";
}

function candlePressure(candles: Candle[]): { long: number; short: number } {
  const slice = candles.slice(-5);
  let bull = 0;
  let bear = 0;
  for (const c of slice) {
    const body = c.close - c.open;
    if (body > 0) bull++;
    else if (body < 0) bear++;
  }
  return { long: bull * 12, short: bear * 12 };
}

function tfTechScore(
  tech: TechnicalAnalysis,
  candles: Candle[],
  price: number
): { long: number; short: number } {
  let l = 0;
  let s = 0;
  if (tech.trend === "bullish") l += 22;
  if (tech.trend === "bearish") s += 22;
  if (tech.rsi < 32) l += 18;
  else if (tech.rsi > 68) s += 18;
  else if (tech.rsi > 52) l += 10;
  else if (tech.rsi < 48) s += 10;
  if (tech.adx >= 18) {
    if (tech.trend === "bullish") l += 14;
    if (tech.trend === "bearish") s += 14;
  } else if (tech.adx >= 14) {
    if (tech.rsi > 55) l += 6;
    if (tech.rsi < 45) s += 6;
  }
  if (price > tech.sma20) l += 10;
  else s += 10;
  if (tech.sma20 > tech.sma50) l += 8;
  else if (tech.sma20 < tech.sma50) s += 8;
  const sup = tech.support[0];
  const res = tech.resistance[0];
  if (sup && price - sup < tech.atr * 0.6) l += 12;
  if (res && res - price < tech.atr * 0.6) s += 12;
  const cp = candlePressure(candles);
  l += cp.long;
  s += cp.short;
  const macd = macdSide(candles.map((c) => c.close));
  if (macd === "long") l += 14;
  if (macd === "short") s += 14;
  return { long: l, short: s };
}

function newsPillar(na: NewsMarketAnalysis | null): { long: number; short: number; note: string } {
  if (!na) return { long: 0, short: 0, note: "Yangiliklar yo'q" };
  if (na.contradictionsUz) return { long: 0, short: 0, note: "Zid yangiliklar" };
  let l = 0;
  let s = 0;
  const str = na.biasStrength;
  if (na.overallBias === "bullish") l += str * 0.55 + na.confidence * 0.2;
  if (na.overallBias === "bearish") s += str * 0.55 + na.confidence * 0.2;
  if (na.newsCandleAligned) {
    if (na.overallBias === "bullish") l += 15;
    if (na.overallBias === "bearish") s += 15;
  }
  if (na.tradeVerdictUz?.toUpperCase().includes("LONG")) l += 10;
  if (na.tradeVerdictUz?.toUpperCase().includes("SHORT")) s += 10;
  if (na.tradeVerdictUz?.toUpperCase().includes("SELL")) s += 8;
  if (na.tradeVerdictUz?.toUpperCase().includes("BUY")) l += 8;
  return {
    long: l,
    short: s,
    note: `${na.overallBias} ${str}% · ishonch ${na.confidence}%`,
  };
}

export function computeShortMasterSignal(input: {
  price: number;
  multiCandles: Partial<Record<ChartInterval, Candle[]>>;
  drivers: MarketQuote[];
  news: NewsMarketAnalysis | null;
  regime: MarketRegime;
  calendar: CalendarStatus;
  session: MarketSessionInfo;
  impulse?: PriceImpulse | null;
}): ShortMasterSignal {
  const { price, multiCandles, drivers, news, regime, calendar, session, impulse } = input;
  const pillars: SignalPillar[] = [];
  const votes: TraderVote[] = [];
  let longTotal = 0;
  let shortTotal = 0;

  const tfs: ChartInterval[] = ["1m", "5m", "15m", "1h"];
  let tfLong = 0;
  let tfShort = 0;
  let tfCount = 0;

  for (const tf of tfs) {
    const candles = multiCandles[tf];
    if (!candles?.length) continue;
    const tech = analyzeTechnicals(candles);
    const w = TF_WEIGHT[tf] ?? 1;
    const sc = tfTechScore(tech, candles, price);
    const l = sc.long * w;
    const s = sc.short * w;
    longTotal += l;
    shortTotal += s;
    tfCount++;
    if (l > s + 5) tfLong++;
    else if (s > l + 5) tfShort++;
    pillars.push({
      labelUz: `${tf} TF`,
      longPts: Math.round(l),
      shortPts: Math.round(s),
      noteUz: `${tech.trend} RSI${tech.rsi} ADX${tech.adx}`,
    });
    votes.push({
      traderUz: `${tf} trend treyder`,
      side: l > s + 3 ? "long" : s > l + 3 ? "short" : "neutral",
      weight: w,
      noteUz: tech.momentum.slice(0, 50),
    });
  }

  const np = newsPillar(news);
  longTotal += np.long * 1.4;
  shortTotal += np.short * 1.4;
  pillars.push({
    labelUz: "Yangiliklar markazi",
    longPts: Math.round(np.long),
    shortPts: Math.round(np.short),
    noteUz: np.note,
  });
  votes.push({
    traderUz: "Makro yangiliklar (Soros uslubi)",
    side: np.long > np.short + 5 ? "long" : np.short > np.long + 5 ? "short" : "neutral",
    weight: 2.2,
    noteUz: np.note,
  });

  const dollar = drivers.find((d) => d.name.toLowerCase().includes("dollar"));
  let macroL = 0;
  let macroS = 0;
  if (dollar) {
    if (dollar.changePercent < -0.12) macroL += 18;
    if (dollar.changePercent > 0.12) macroS += 18;
  }
  macroL += Math.max(0, regime.goldLongAdjust) * 9;
  macroS += Math.max(0, -regime.goldLongAdjust) * 9;
  longTotal += macroL;
  shortTotal += macroS;
  pillars.push({
    labelUz: "Makro (DXY/rejim)",
    longPts: macroL,
    shortPts: macroS,
    noteUz: regime.summaryUz.slice(0, 70),
  });
  votes.push({
    traderUz: "Makro fond (Dalio)",
    side: macroL > macroS + 4 ? "long" : macroS > macroL + 4 ? "short" : "neutral",
    weight: 1.8,
    noteUz: regime.summaryUz.slice(0, 60),
  });

  if (session.primeWindow) {
    longTotal += 8;
    shortTotal += 8;
    votes.push({
      traderUz: "Sessiya (London/NY)",
      side: "neutral",
      weight: 1,
      noteUz: `${session.nameUz} — likvidlik yuqori`,
    });
  } else if (session.active) {
    votes.push({
      traderUz: "Sessiya",
      side: "neutral",
      weight: 0.8,
      noteUz: session.nameUz,
    });
  }

  if (impulse && impulse.moveUsd >= 0.7) {
    if (impulse.direction === "long") longTotal += 22 + impulse.moveUsd * 4;
    else shortTotal += 22 + impulse.moveUsd * 4;
    pillars.push({
      labelUz: "Impuls (flash move)",
      longPts: impulse.direction === "long" ? 30 : 0,
      shortPts: impulse.direction === "short" ? 30 : 0,
      noteUz: `${impulse.direction.toUpperCase()} $${impulse.moveUsd} / ${impulse.windowSec}s`,
    });
    votes.push({
      traderUz: "Momentum scalper",
      side: impulse.direction,
      weight: 2.5,
      noteUz: `$${impulse.moveUsd} harakat`,
    });
  }

  if (calendar.inHighImpactWindow) {
    longTotal *= 0.35;
    shortTotal *= 0.35;
    votes.push({
      traderUz: "Taqvim himoyasi",
      side: "neutral",
      weight: 3,
      noteUz: calendar.hintUz?.slice(0, 60) ?? "Yuqori ta'sir voqea",
    });
  }

  const maxSide = Math.max(longTotal, shortTotal, 1);
  const longScore = Math.min(100, Math.round((longTotal / maxSide) * 58 + tfLong * 9));
  const shortScore = Math.min(100, Math.round((shortTotal / maxSide) * 58 + tfShort * 9));

  const primary =
    multiCandles["5m"]?.length ? multiCandles["5m"]! : multiCandles["1m"] ?? [];
  const tech5 = analyzeTechnicals(
    primary.length ? primary : [{ time: 0, open: price, high: price, low: price, close: price }]
  );

  let bias: "long" | "short" | "wait" = "wait";
  const lead = 6;
  const strong = 48;
  const dominant = 55;

  if (longScore >= dominant && longScore - shortScore >= lead) bias = "long";
  else if (shortScore >= dominant && shortScore - longScore >= lead) bias = "short";
  else if (longScore >= strong && longScore >= shortScore * 1.12) bias = "long";
  else if (shortScore >= strong && shortScore >= longScore * 1.12) bias = "short";
  else if (tfLong >= 3 && tfLong > tfShort) bias = "long";
  else if (tfShort >= 3 && tfShort > tfLong) bias = "short";
  else if (tech5.rsi < 28 && tech5.trend !== "bearish") bias = "long";
  else if (tech5.rsi > 72 && tech5.trend !== "bullish") bias = "short";

  const voteLong = votes.filter((v) => v.side === "long").reduce((a, v) => a + v.weight, 0);
  const voteShort = votes.filter((v) => v.side === "short").reduce((a, v) => a + v.weight, 0);
  if (bias === "wait" && voteLong - voteShort >= 2.5) bias = "long";
  if (bias === "wait" && voteShort - voteLong >= 2.5) bias = "short";

  const winScore = bias === "long" ? longScore : bias === "short" ? shortScore : 0;
  const tfAligned = bias === "long" ? tfLong : bias === "short" ? tfShort : 0;
  const confluencePct = Math.min(
    100,
    Math.round(
      (tfCount > 0 ? (tfAligned / tfCount) * 55 : 0) +
        (news?.newsCandleAligned ? 15 : 0) +
        (news ? news.confidence * 0.2 : 0) +
        winScore * 0.25
    )
  );
  const confidence = Math.min(
    96,
    Math.round(
      38 +
        winScore * 0.35 +
        tfAligned * 8 +
        (news?.confidence ?? 0) * 0.15 +
        (tech5.adx >= 16 ? 8 : 0)
    )
  );

  const panelUz = votes
    .filter((v) => v.side !== "neutral")
    .slice(0, 8)
    .map((v) => `${v.traderUz}: ${v.side.toUpperCase()}`)
    .join(" · ");

  const summaryUz =
    bias === "wait"
      ? `Panel: L${longScore} vs S${shortScore} — aniq ustunlik yo'q (${tfLong}L/${tfShort}S TF).`
      : `YAKUNIY ${bias.toUpperCase()}: L${longScore} S${shortScore} · ${tfAligned}/${tfCount} TF · ${votes.filter((v) => v.side === bias).length} treyder mos.`;

  return {
    bias,
    longScore,
    shortScore,
    confidence,
    confluencePct,
    pillars,
    votes,
    summaryUz,
    panelUz,
  };
}
