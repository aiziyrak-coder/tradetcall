import type { ChartInterval } from "./chart";
import type {
  Candle,
  MarketQuote,
  NewsItem,
  NewsMarketAnalysis,
  ShortTermStrategy,
  StrategyStep,
  TimeframeSignal,
} from "./types";
import { buildSignalDetail } from "./signal-detail";
import { analyzeTechnicals } from "./technical";
import { applyTradeGate, ensureTakeProfitRR } from "./trade-gate";

const SHORT_TFS: ChartInterval[] = ["1m", "5m", "15m", "1h"];

const TF_META: Record<string, { labelUz: string; weight: number }> = {
  "1m": { labelUz: "1 daqiqa", weight: 1 },
  "5m": { labelUz: "5 daqiqa", weight: 1.5 },
  "15m": { labelUz: "15 daqiqa", weight: 2 },
  "1h": { labelUz: "1 soat", weight: 2.5 },
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function atr(candles: Candle[], period = 10): number {
  if (candles.length < 2) return 0;
  const slice = candles.slice(-period);
  return slice.reduce((s, c) => s + (c.high - c.low), 0) / slice.length;
}

function tfBias(tech: ReturnType<typeof analyzeTechnicals>): TimeframeSignal["bias"] {
  if (tech.trend === "bullish" && tech.rsi < 70) return "long";
  if (tech.trend === "bearish" && tech.rsi > 30) return "short";
  if (tech.rsi > 70) return "short";
  if (tech.rsi < 30) return "long";
  return "neutral";
}

function formatClockOffset(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function newsScoreShort(na: NewsMarketAnalysis | null): number {
  if (!na) return 0;
  let s = 0;
  if (na.overallBias === "bullish") s += na.biasStrength / 20;
  if (na.overallBias === "bearish") s -= na.biasStrength / 20;
  if (!na.newsCandleAligned) s *= 0.35;
  if (na.contradictionsUz) return 0;
  return s;
}

export function computeShortTermStrategy(
  price: number,
  multiCandles: Partial<Record<ChartInterval, Candle[]>>,
  drivers: MarketQuote[],
  _news: NewsItem[],
  newsAnalysis?: NewsMarketAnalysis | null
): ShortTermStrategy {
  const primary = multiCandles["5m"]?.length
    ? multiCandles["5m"]!
    : multiCandles["1m"] ?? [];
  const tech5 = analyzeTechnicals(
    primary.length ? primary : [{ time: 0, open: price, high: price, low: price, close: price }]
  );
  const atr5 = atr(primary) || price * 0.0012;
  const atr1 = atr(multiCandles["1m"] ?? primary) || atr5 * 0.6;
  const na = newsAnalysis ?? null;

  const timeframes: TimeframeSignal[] = [];
  let score = 0;
  let aligned = 0;

  for (const tf of SHORT_TFS) {
    const candles = multiCandles[tf];
    if (!candles?.length) continue;
    const tech = analyzeTechnicals(candles);
    const tb = tfBias(tech);
    const meta = TF_META[tf];
    if (tb === "long") {
      score += meta.weight;
      aligned++;
    } else if (tb === "short") {
      score -= meta.weight;
      aligned++;
    }
    timeframes.push({
      interval: tf,
      labelUz: meta.labelUz,
      trend: tech.trend,
      rsi: tech.rsi,
      bias: tb,
      noteUz: tb === "long" ? "TF long" : tb === "short" ? "TF short" : "TF neytral",
    });
  }

  const dollar = drivers.find((d) => d.name.toLowerCase().includes("dollar"));
  if (dollar && dollar.changePercent > 0.2) score -= 1;
  if (dollar && dollar.changePercent < -0.2) score += 1;
  score += newsScoreShort(na);

  const longVotes = timeframes.filter((t) => t.bias === "long").length;
  const shortVotes = timeframes.filter((t) => t.bias === "short").length;

  let bias: ShortTermStrategy["bias"] = "wait";
  if (score >= 3 && longVotes >= 3) bias = "long";
  else if (score <= -3 && shortVotes >= 3) bias = "short";

  const sup = tech5.support[0] ?? price - atr5;
  const res = tech5.resistance[0] ?? price + atr5;
  const nowStr = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  const exitBy = formatClockOffset(30);

  let entry: StrategyStep;
  let exit: StrategyStep;
  let stopLoss: number;
  let takeProfit: number;
  let situationUz: string;

  if (bias === "long") {
    const entryFrom = round2(price - atr5 * 0.5);
    const entryTo = round2(price - atr1 * 0.05);
    const entryMid = round2((entryFrom + entryTo) / 2);
    entry = {
      title: "KIRISH (long)",
      whenUz: `${nowStr} — 15 daqiqa, max 30 daqiqa lot`,
      priceHint: `$${entryFrom} — $${entryTo}`,
      priceFrom: entryFrom,
      priceTo: entryTo,
    };
    stopLoss = round2(Math.min(sup - atr5 * 0.4, price - atr5 * 1.05));
    takeProfit = round2(price + Math.max(atr5 * 1.25, atr1 * 2));
    takeProfit = ensureTakeProfitRR(entryMid, stopLoss, takeProfit, "long", 1.8);
    exit = {
      title: "CHIQISH",
      whenUz: `TP yoki ${exitBy} (30 daqiqa)`,
      priceHint: `TP $${takeProfit}`,
      priceFrom: round2(takeProfit - atr1 * 0.15),
      priceTo: round2(takeProfit + atr1 * 0.1),
    };
    situationUz = `Short LONG: ${longVotes}/4 TF, yangiliklar tekshirildi. $${price}.`;
  } else if (bias === "short") {
    const entryFrom = round2(price + atr1 * 0.05);
    const entryTo = round2(price + atr5 * 0.5);
    const entryMid = round2((entryFrom + entryTo) / 2);
    entry = {
      title: "KIRISH (short)",
      whenUz: `${nowStr} — max 30 daqiqa`,
      priceHint: `$${entryFrom} — $${entryTo}`,
      priceFrom: entryFrom,
      priceTo: entryTo,
    };
    stopLoss = round2(Math.max(res + atr5 * 0.4, price + atr5 * 1.05));
    takeProfit = round2(price - Math.max(atr5 * 1.25, atr1 * 2));
    takeProfit = ensureTakeProfitRR(entryMid, stopLoss, takeProfit, "short", 1.8);
    exit = {
      title: "CHIQISH",
      whenUz: `TP yoki ${exitBy}`,
      priceHint: `TP $${takeProfit}`,
      priceFrom: round2(takeProfit - atr1 * 0.1),
      priceTo: round2(takeProfit + atr1 * 0.15),
    };
    situationUz = `Short SHORT: ${shortVotes}/4 TF. $${price}.`;
  } else {
    entry = {
      title: "KIRISH",
      whenUz: "TF lar mos emas — KUTING",
      priceHint: `$${round2(sup)} / $${round2(res)}`,
      priceFrom: round2(sup),
      priceTo: round2(res),
    };
    exit = { title: "CHIQISH", whenUz: "—", priceHint: "—" };
    stopLoss = round2(price - atr5 * 1.2);
    takeProfit = round2(price + atr5 * 1.2);
    situationUz = `30 daqiqalik savdo uchun signal yo'q. Yangiliklar panelini kuzating.`;
  }

  const entryFrom = entry.priceFrom ?? round2(price - atr5);
  const entryTo = entry.priceTo ?? round2(price + atr5);
  const entryMid = round2((entryFrom + entryTo) / 2);
  const exitPrice =
    exit.priceFrom && exit.priceTo
      ? round2((exit.priceFrom + exit.priceTo) / 2)
      : takeProfit;

  const riskPts = Math.abs(entryMid - stopLoss);
  const rewardPts = Math.abs(takeProfit - entryMid);
  const riskReward = riskPts > 0 ? round2(rewardPts / riskPts) : 0;

  const tfTotal = SHORT_TFS.length;
  const tfAligned = bias === "long" ? longVotes : bias === "short" ? shortVotes : 0;
  const confluencePct = Math.min(
    100,
    Math.round((tfAligned / tfTotal) * 85 + (na?.newsCandleAligned ? 12 : 0))
  );
  const confidence = Math.min(92, Math.round(36 + Math.abs(score) * 7 + tfAligned * 5 + (na?.confidence ?? 0) * 0.15));

  const gate = applyTradeGate({
    bias,
    news: na,
    riskReward,
    confluencePct,
    confidence,
    techScore: score,
    mode: "short",
  });

  const finalBias = gate.effectiveBias;

  const signal = buildSignalDetail(
    price,
    finalBias,
    entryFrom,
    entryTo,
    exitPrice,
    stopLoss,
    takeProfit,
    confidence,
    confluencePct,
    atr5,
    [
      {
        ok: tfAligned >= 3 && gate.allowed,
        textUz:
          tfAligned >= 3
            ? `${tfAligned}/4 TF + yangiliklar`
            : `TF yetarli emas (${tfAligned}/4)`,
      },
    ],
    gate
  );

  const keyLevels = [
    { label: "SL", price: stopLoss },
    { label: "Kirish", price: signal.entryPrice },
    { label: "TP", price: takeProfit },
    { label: "5m past", price: round2(sup) },
    { label: "5m yuqori", price: round2(res) },
  ];

  return {
    bias: finalBias,
    horizonUz: "Maksimum 30 daqiqa",
    confidence,
    situationUz: `${gate.capitalRuleUz} ${gate.newsVerdictUz} ${signal.oneLineUz} ${situationUz}`,
    entry,
    exit,
    stopLoss,
    takeProfit,
    maxHoldMinutes: 30,
    lotRuleUz:
      "30 daqiqa qoidasi. SL majburiy. Yangiliklar zid bo'lsa lot OCHMANG. R:R past bo'lsa KIRMANG.",
    timeframes,
    invalidationUz:
      finalBias === "long"
        ? `1m yopilish $${stopLoss} dan past — STOP.`
        : finalBias === "short"
          ? `1m yopilish $${stopLoss} dan yuqori — STOP.`
          : gate.reasonUz,
    technical: tech5,
    signal,
    tfAligned,
    tfTotal,
    keyLevels,
  };
}

export const SHORT_STRATEGY_INTERVALS = SHORT_TFS;
