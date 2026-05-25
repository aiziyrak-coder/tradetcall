import type {
  Candle,
  LongTermStrategy,
  MarketQuote,
  NewsItem,
  NewsMarketAnalysis,
  StrategyStep,
} from "./types";
import { buildSignalDetail } from "./signal-detail";
import { analyzeTechnicals } from "./technical";

const DAY_UZ = [
  "yakshanba",
  "dushanba",
  "seshanba",
  "chorshanba",
  "juma",
  "shanba",
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function nextTradingDays(count: number): { label: string; date: Date }[] {
  const out: { label: string; date: Date }[] = [];
  const d = new Date();
  for (let i = 1; i <= 14 && out.length < count; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    const wd = x.getDay();
    if (wd === 0 || wd === 6) continue;
    out.push({ label: DAY_UZ[wd], date: x });
  }
  return out;
}

function atr(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0;
  const slice = candles.slice(-period);
  return slice.reduce((s, c) => s + (c.high - c.low), 0) / slice.length;
}

function newsBias(news: NewsItem[]): number {
  let s = 0;
  for (const n of news.slice(0, 12)) {
    const t = `${n.title} ${n.summary}`.toLowerCase();
    if (/surge|rally|rise|bull|safe haven|rate cut|weak dollar|inflation/i.test(t)) s += 1;
    if (/fall|drop|bear|rate hike|strong dollar|recession/i.test(t)) s -= 1;
  }
  return s;
}

function buildWhenUz(days: { label: string; date: Date }[], session: string): string {
  const names = days.map((d) => d.label).join(", ");
  const from = days[0]?.date;
  const to = days[days.length - 1]?.date;
  const range =
    from && to
      ? `${from.getDate()}.${from.getMonth() + 1} — ${to.getDate()}.${to.getMonth() + 1}`
      : "keyingi 5–10 ish kuni";
  return `${range} (${names}). Soat: ${session} (Toshkent vaqti, London/NY sessiyasi)`;
}

function applyNewsToScore(score: number, na: NewsMarketAnalysis | null): number {
  if (!na) return score;
  let s = score;
  if (na.overallBias === "bullish") s += na.biasStrength / 35;
  if (na.overallBias === "bearish") s -= na.biasStrength / 35;
  if (na.contradictionsUz) s *= 0.55;
  else if (!na.newsCandleAligned) s *= 0.75;
  return s;
}

export function computeLongTermStrategy(
  price: number,
  candles: Candle[],
  drivers: MarketQuote[],
  news: NewsItem[],
  newsAnalysis?: NewsMarketAnalysis | null
): LongTermStrategy {
  const tech = analyzeTechnicals(candles);
  const dollar = drivers.find((d) => d.name.toLowerCase().includes("dollar"));
  const nBias = newsBias(news);
  const atrVal = atr(candles) || price * 0.008;

  let score = 0;
  if (tech.trend === "bullish") score += 2;
  if (tech.trend === "bearish") score -= 2;
  if (tech.rsi < 38) score += 1.2;
  if (tech.rsi > 62) score -= 1.2;
  if (price > tech.sma50) score += 0.8;
  else score -= 0.8;
  if (dollar && dollar.changePercent > 0.2) score -= 1;
  if (dollar && dollar.changePercent < -0.2) score += 1;
  score += nBias * 0.5;
  score = applyNewsToScore(score, newsAnalysis ?? null);

  let bias: LongTermStrategy["bias"] = "wait";
  if (score >= 1.8) bias = "long";
  else if (score <= -1.8) bias = "short";

  const sup = tech.support[0] ?? price - atrVal * 2;
  const res = tech.resistance[0] ?? price + atrVal * 2;
  const days = nextTradingDays(4);
  const session = "15:00 — 21:00";

  let entry: StrategyStep;
  let exit: StrategyStep;
  let stopLoss: number;
  let takeProfit: number;
  let situationUz: string;

  if (bias === "long") {
    const entryMid = round2((sup + price) / 2);
    const entryFrom = round2(sup - atrVal * 0.3);
    const entryTo = round2(sup + atrVal * 0.5);
    entry = {
      title: "KIRISH (sotib olish)",
      whenUz: buildWhenUz(days.slice(0, 3), session),
      priceHint: `Narx $${entryFrom} — $${entryTo} oralig'iga tushganda (yaqinida $${entryMid})`,
      priceFrom: entryFrom,
      priceTo: entryTo,
    };
    exit = {
      title: "CHIQISH (foyda yopish)",
      whenUz: `Keyingi 1–4 hafta ichida, ${res > price ? "qarshilik" : "maqsad"} zonasida`,
      priceHint: `Narx $${round2(res - atrVal * 0.2)} — $${round2(res + atrVal * 0.2)} ga chiqganda qisman/yopiq chiqing`,
      priceFrom: round2(res - atrVal * 0.3),
      priceTo: round2(res + atrVal * 0.3),
    };
    stopLoss = round2(sup - atrVal * 1.2);
    takeProfit = round2(res + atrVal * 0.2);
    situationUz =
      `Bozor uzoq muddatda yuqoriga moyil. Hozir $${price}. ` +
      `Qo'llab-quvvatlash $${sup} atrofida — shu zonada sabr bilan kirish ma'qul. ` +
      `RSI ${tech.rsi}, trend ${tech.trend}. ${tech.momentum}. ` +
      `Kunlik/haftalik savdo: bir haftada 0–1 marta kirish yetarli.`;
  } else if (bias === "short") {
    const entryMid = round2((res + price) / 2);
    const entryFrom = round2(res - atrVal * 0.5);
    const entryTo = round2(res + atrVal * 0.3);
    entry = {
      title: "KIRISH (sotish / short)",
      whenUz: buildWhenUz(days.slice(0, 3), session),
      priceHint: `Narx $${entryFrom} — $${entryTo} oralig'iga ko'tarilganda (yaqinida $${entryMid})`,
      priceFrom: entryFrom,
      priceTo: entryTo,
    };
    exit = {
      title: "CHIQISH (short yopish)",
      whenUz: "Keyingi 1–4 hafta ichida, qo'llab-quvvatlash zonasida",
      priceHint: `Narx $${round2(sup - atrVal * 0.2)} — $${round2(sup + atrVal * 0.2)} ga tushganda yoping`,
      priceFrom: round2(sup - atrVal * 0.3),
      priceTo: round2(sup + atrVal * 0.3),
    };
    stopLoss = round2(res + atrVal * 1.2);
    takeProfit = round2(sup - atrVal * 0.2);
    situationUz =
      `Bozor uzoq muddatda bosim ostida. Hozir $${price}. ` +
      `Qarshilik $${res} yaqinida sotish zonasi. RSI ${tech.rsi}. ${tech.momentum}. ` +
      `Tez-tez savdo qilmang — signal tasdiqlanguncha kuting.`;
  } else {
    entry = {
      title: "KIRISH",
      whenUz: "Hozir kirmang — keyingi aniq zona shakllanishini kuting",
      priceHint: `Kuzatuv: $${round2(sup)} (past) yoki $${round2(res)} (yuqori) sinovidan keyin`,
      priceFrom: round2(sup),
      priceTo: round2(res),
    };
    exit = {
      title: "CHIQISH",
      whenUz: "Reja shakllangach AI prognoz bilan yangilanadi",
      priceHint: "—",
    };
    stopLoss = round2(price - atrVal * 2);
    takeProfit = round2(price + atrVal * 2);
    situationUz =
      `Bozor noaniq (yonoq). Hozir $${price}. RSI ${tech.rsi}, ${tech.momentum}. ` +
      `1 kun yoki 1 haftada bir marta savdo uchun aniq yo'nalish hali yo'q — ` +
      `«AI strategiya» tugmasi bilan batafsil reja oling.`;
  }

  const newsConf = newsAnalysis?.confidence ?? 0;
  const confidence = Math.min(
    88,
    Math.round(42 + Math.abs(score) * 10 + newsConf * 0.15)
  );
  const entryFrom = entry.priceFrom ?? round2(price - atrVal);
  const entryTo = entry.priceTo ?? round2(price + atrVal);
  const exitPrice =
    exit.priceFrom && exit.priceTo
      ? round2((exit.priceFrom + exit.priceTo) / 2)
      : takeProfit;
  const confluencePct = Math.min(
    95,
    Math.round(35 + Math.abs(score) * 12 + (bias !== "wait" ? 15 : 0))
  );

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
    atrVal
  );

  const keyLevels = [
    { label: "SL", price: stopLoss },
    { label: "Kirish", price: signal.entryPrice },
    { label: "TP", price: takeProfit },
    { label: "Past", price: round2(sup) },
    { label: "Yuqori", price: round2(res) },
  ];

  return {
    bias,
    horizonUz: "1 hafta — 4 hafta (swing / pozitsion)",
    confidence,
    situationUz:
      (newsAnalysis?.recommendationUz ? newsAnalysis.recommendationUz + " " : "") +
      (newsAnalysis?.trendOutlookUz ? newsAnalysis.trendOutlookUz + " " : "") +
      signal.oneLineUz +
      " " +
      situationUz,
    entry,
    exit,
    stopLoss,
    takeProfit,
    invalidationUz:
      bias === "long"
        ? `Agar narx $${stopLoss} dan past yopilsa (kunlik yopilish) — reja bekor, zarar cheklang.`
        : bias === "short"
          ? `Agar narx $${stopLoss} dan yuqori yopilsa — short bekor.`
          : `Kuchli yangilik yoki Fed qarori bo'lsa — kuting va qayta baholang.`,
    technical: tech,
    signal,
    keyLevels,
  };
}
