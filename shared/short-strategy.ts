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

function tfBias(
  tech: ReturnType<typeof analyzeTechnicals>
): TimeframeSignal["bias"] {
  if (tech.trend === "bullish" && tech.rsi < 72) return "long";
  if (tech.trend === "bearish" && tech.rsi > 28) return "short";
  if (tech.rsi > 68) return "short";
  if (tech.rsi < 32) return "long";
  return "neutral";
}

function formatClockOffset(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function newsPulse(news: NewsItem[]): number {
  let s = 0;
  for (const n of news.slice(0, 6)) {
    const t = `${n.title} ${n.summary}`.toLowerCase();
    if (/surge|rally|rise|bull|safe haven|rate cut/i.test(t)) s += 0.5;
    if (/fall|drop|bear|rate hike|strong dollar/i.test(t)) s -= 0.5;
  }
  return s;
}

function applyNewsShort(score: number, na: NewsMarketAnalysis | null): number {
  if (!na) return score;
  let s = score;
  if (na.overallBias === "bullish") s += na.biasStrength / 28;
  if (na.overallBias === "bearish") s -= na.biasStrength / 28;
  if (na.contradictionsUz) return s * 0.4;
  if (!na.newsCandleAligned) s *= 0.65;
  return s;
}

export function computeShortTermStrategy(
  price: number,
  multiCandles: Partial<Record<ChartInterval, Candle[]>>,
  drivers: MarketQuote[],
  news: NewsItem[],
  newsAnalysis?: NewsMarketAnalysis | null
): ShortTermStrategy {
  const primary = multiCandles["5m"]?.length
    ? multiCandles["5m"]!
    : multiCandles["1m"] ?? [];
  const tech5 = analyzeTechnicals(primary.length ? primary : [{ time: 0, open: price, high: price, low: price, close: price }]);
  const atr5 = atr(primary) || price * 0.0012;
  const atr1 = atr(multiCandles["1m"] ?? primary) || atr5 * 0.6;

  const timeframes: TimeframeSignal[] = [];
  let score = 0;
  let aligned = 0;

  for (const tf of SHORT_TFS) {
    const candles = multiCandles[tf];
    if (!candles?.length) continue;
    const tech = analyzeTechnicals(candles);
    const bias = tfBias(tech);
    const meta = TF_META[tf];
    if (bias === "long") {
      score += meta.weight;
      aligned++;
    } else if (bias === "short") {
      score -= meta.weight;
      aligned++;
    }
    let noteUz = tech.momentum;
    if (bias === "long") noteUz = "Qisqa muddat: yuqoriga kirish zonasi";
    if (bias === "short") noteUz = "Qisqa muddat: pastga sotish zonasi";
    timeframes.push({
      interval: tf,
      labelUz: meta.labelUz,
      trend: tech.trend,
      rsi: tech.rsi,
      bias,
      noteUz,
    });
  }

  const dollar = drivers.find((d) => d.name.toLowerCase().includes("dollar"));
  if (dollar && dollar.changePercent > 0.15) score -= 0.8;
  if (dollar && dollar.changePercent < -0.15) score += 0.8;
  score += newsPulse(news);
  score = applyNewsShort(score, newsAnalysis ?? null);

  let bias: ShortTermStrategy["bias"] = "wait";
  const longVotes = timeframes.filter((t) => t.bias === "long").length;
  const shortVotes = timeframes.filter((t) => t.bias === "short").length;
  if (score >= 2.4 || longVotes >= 3) bias = "long";
  else if (score <= -2.4 || shortVotes >= 3) bias = "short";

  const sup = tech5.support[0] ?? price - atr5;
  const res = tech5.resistance[0] ?? price + atr5;
  const nowStr = new Date().toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const exitBy = formatClockOffset(30);

  let entry: StrategyStep;
  let exit: StrategyStep;
  let stopLoss: number;
  let takeProfit: number;
  let situationUz: string;

  if (bias === "long") {
    const entryMid = round2(price - atr1 * 0.25);
    const entryFrom = round2(price - atr5 * 0.55);
    const entryTo = round2(price - atr1 * 0.08);
    entry = {
      title: "KIRISH (sotib olish)",
      whenUz: `${nowStr} — ${formatClockOffset(15)} oralig'ida (1m/5m/15m/1h mos). Lot 30 daqiqagacha ochiq`,
      priceHint: `Narx $${entryFrom} — $${entryTo} ga tushganda kirish (optimal ~$${entryMid})`,
      priceFrom: entryFrom,
      priceTo: entryTo,
    };
    takeProfit = round2(price + Math.max(atr5 * 1.1, atr1 * 1.8));
    stopLoss = round2(Math.min(sup - atr5 * 0.35, price - atr5 * 1.15));
    exit = {
      title: "CHIQISH (foyda / vaqt)",
      whenUz: `TP ga yetganda yoki ${exitBy} gacha (30 daqiqa — vaqt stop)`,
      priceHint: `Narx $${round2(takeProfit - atr1 * 0.15)} — $${round2(takeProfit + atr1 * 0.1)} da yoping`,
      priceFrom: round2(takeProfit - atr1 * 0.2),
      priceTo: round2(takeProfit + atr1 * 0.15),
    };
    situationUz =
      `Qisqa muddat LONG: ${aligned}/${SHORT_TFS.length} timeframe bir yo'nalishda. ` +
      `Hozir $${price}. 1m RSI ${multiCandles["1m"] ? analyzeTechnicals(multiCandles["1m"]!).rsi : tech5.rsi}, ` +
      `5m ${tech5.trend}. Maqsad: 30 daqiqa ichida kichik foyda.`;
  } else if (bias === "short") {
    const entryMid = round2(price + atr1 * 0.25);
    const entryFrom = round2(price + atr1 * 0.08);
    const entryTo = round2(price + atr5 * 0.55);
    entry = {
      title: "KIRISH (sotish)",
      whenUz: `${nowStr} — ${formatClockOffset(15)} oralig'ida. Lot maksimum 30 daqiqa`,
      priceHint: `Narx $${entryFrom} — $${entryTo} ga ko'tarilganda short (optimal ~$${entryMid})`,
      priceFrom: entryFrom,
      priceTo: entryTo,
    };
    takeProfit = round2(price - Math.max(atr5 * 1.1, atr1 * 1.8));
    stopLoss = round2(Math.max(res + atr5 * 0.35, price + atr5 * 1.15));
    exit = {
      title: "CHIQISH (short yopish)",
      whenUz: `TP yoki ${exitBy} (30 daqiqa tugashi)`,
      priceHint: `Narx $${round2(takeProfit - atr1 * 0.15)} — $${round2(takeProfit + atr1 * 0.1)}`,
      priceFrom: round2(takeProfit - atr1 * 0.15),
      priceTo: round2(takeProfit + atr1 * 0.1),
    };
    situationUz =
      `Qisqa muddat SHORT: timeframe lar pastga moyil. Hozir $${price}. ` +
      `Tez kirish — tez chiqish. 30 daqiqadan oshirmang.`;
  } else {
    entry = {
      title: "KIRISH",
      whenUz: "TF lar mos kelmaguncha kutmang (1m, 5m, 15m, 1h)",
      priceHint: `Kuzatuv: $${round2(sup)} past / $${round2(res)} yuqori sinovi`,
      priceFrom: round2(sup),
      priceTo: round2(res),
    };
    exit = {
      title: "CHIQISH",
      whenUz: "Signal shakllangach yangilanadi",
      priceHint: "—",
    };
    stopLoss = round2(price - atr5 * 1.2);
    takeProfit = round2(price + atr5 * 1.2);
    situationUz =
      `Qisqa muddat: timeframe lar aralash (${aligned} ta yo'nalish). ` +
      `Hozir $${price} — 30 daqiqalik savdo uchun aniq signal yo'q. ` +
      `Barcha TF bir xil bo'lganda panel yangilanadi.`;
  }

  const confidence = Math.min(
    92,
    Math.round(38 + Math.abs(score) * 8 + aligned * 4)
  );

  const tfTotal = SHORT_TFS.length;
  const tfAligned =
    bias === "long" ? longVotes : bias === "short" ? shortVotes : 0;
  const confluencePct = Math.min(
    100,
    Math.round((tfAligned / tfTotal) * 100 + (bias !== "wait" ? 10 : 0))
  );

  const entryFrom = entry.priceFrom ?? round2(price - atr5);
  const entryTo = entry.priceTo ?? round2(price + atr5);
  const exitPrice =
    exit.priceFrom && exit.priceTo
      ? round2((exit.priceFrom + exit.priceTo) / 2)
      : takeProfit;

  const signal = buildSignalDetail(
    price,
    bias,
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
        ok: tfAligned >= 3,
        textUz:
          tfAligned >= 3
            ? `${tfAligned}/${tfTotal} timeframe bir xil`
            : `TF mos emas (${tfAligned}/${tfTotal})`,
      },
    ]
  );

  const keyLevels = [
    { label: "SL", price: stopLoss },
    { label: "Kirish", price: signal.entryPrice },
    { label: "TP", price: takeProfit },
    { label: "Chiqish", price: exitPrice },
    { label: "5m past", price: round2(sup) },
    { label: "5m yuqori", price: round2(res) },
  ];

  return {
    bias,
    horizonUz: "Maksimum 30 daqiqa (lot ochiq vaqt)",
    confidence,
    situationUz:
      (newsAnalysis?.recommendationUz ? newsAnalysis.recommendationUz + " " : "") +
      signal.oneLineUz +
      (newsAnalysis?.contradictionsUz ? " DIQQAT: " + newsAnalysis.contradictionsUz : ""),
    entry,
    exit,
    stopLoss,
    takeProfit,
    maxHoldMinutes: 30,
    lotRuleUz:
      "Lot ochiq turishi: eng ko'pi 30 daqiqa. Vaqt tugasa bozor narxida yoping (foyda yoki zarar). TP yoki SL oldin ishlasa — darhol yoping.",
    timeframes,
    invalidationUz:
      bias === "long"
        ? `Narx $${stopLoss} dan past 1m yopilish — LONG bekor, zarar cheklang.`
        : bias === "short"
          ? `Narx $${stopLoss} dan yuqori 1m yopilish — SHORT bekor.`
          : `Kuchli yangilik: 5 daqiqa kuting, qayta baholang.`,
    technical: tech5,
    signal,
    tfAligned,
    tfTotal,
    keyLevels,
  };
}

export const SHORT_STRATEGY_INTERVALS = SHORT_TFS;
