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
import { applyTradeGate, ensureTakeProfitRR } from "./trade-gate";
import { waitTradeLevels } from "./strategy-levels";

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

function buildWhenUz(days: { label: string; date: Date }[], session: string): string {
  const names = days.map((d) => d.label).join(", ");
  const from = days[0]?.date;
  const to = days[days.length - 1]?.date;
  const range =
    from && to
      ? `${from.getDate()}.${from.getMonth() + 1} — ${to.getDate()}.${to.getMonth() + 1}`
      : "keyingi 5–10 ish kuni";
  return `${range} (${names}). Soat: ${session} (Toshkent, London/NY sessiyasi)`;
}

/** Yangiliklar — yagona sentiment manbai (regex takrorlanmaydi) */
function newsScoreFromAnalysis(na: NewsMarketAnalysis | null): number {
  if (!na) return 0;
  let s = 0;
  if (na.overallBias === "bullish") s += na.biasStrength / 22;
  if (na.overallBias === "bearish") s -= na.biasStrength / 22;
  if (na.newsCandleAligned) s *= 1.15;
  else s *= 0.45;
  if (na.contradictionsUz) return s * 0.2;
  return s;
}

export function computeLongTermStrategy(
  price: number,
  candles: Candle[],
  drivers: MarketQuote[],
  _news: NewsItem[],
  newsAnalysis?: NewsMarketAnalysis | null
): LongTermStrategy {
  const tech = analyzeTechnicals(candles);
  const dollar = drivers.find((d) => d.name.toLowerCase().includes("dollar"));
  const atrVal = atr(candles) || price * 0.008;
  const na = newsAnalysis ?? null;

  let score = 0;
  if (tech.trend === "bullish") score += 2;
  if (tech.trend === "bearish") score -= 2;
  if (tech.rsi < 36) score += 1;
  if (tech.rsi > 64) score -= 1;
  if (price > tech.sma50) score += 0.6;
  else score -= 0.6;
  if (dollar && dollar.changePercent > 0.25) score -= 1.2;
  if (dollar && dollar.changePercent < -0.25) score += 1.2;
  score += newsScoreFromAnalysis(na);

  let bias: LongTermStrategy["bias"] = "wait";
  if (score >= 3.2) bias = "long";
  else if (score <= -3.2) bias = "short";

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
    const entryFrom = round2(sup - atrVal * 0.25);
    const entryTo = round2(sup + atrVal * 0.45);
    const entryMid = round2((entryFrom + entryTo) / 2);
    entry = {
      title: "KIRISH (sotib olish)",
      whenUz: buildWhenUz(days.slice(0, 3), session),
      priceHint: `Faqat $${entryFrom} — $${entryTo} zonasida (≈$${entryMid})`,
      priceFrom: entryFrom,
      priceTo: entryTo,
    };
    stopLoss = round2(sup - atrVal * 1.1);
    takeProfit = round2(res + atrVal * 0.15);
    takeProfit = ensureTakeProfitRR(entryMid, stopLoss, takeProfit, "long", 2);
    exit = {
      title: "CHIQISH (foyda)",
      whenUz: "TP yoki qarshilik — qisman yopish mumkin",
      priceHint: `Maqsad $${takeProfit} (R:R ≥ 1:2)`,
      priceFrom: round2(takeProfit - atrVal * 0.2),
      priceTo: round2(takeProfit + atrVal * 0.15),
    };
    situationUz =
      `Swing LONG: $${price}. Qo'llab-quvvatlash $${round2(sup)}. RSI ${tech.rsi}. ` +
      `Haftada 0–1 lot — yangiliklar tasdiqlanguncha kirmang.`;
  } else if (bias === "short") {
    const entryFrom = round2(res - atrVal * 0.45);
    const entryTo = round2(res + atrVal * 0.25);
    const entryMid = round2((entryFrom + entryTo) / 2);
    entry = {
      title: "KIRISH (short)",
      whenUz: buildWhenUz(days.slice(0, 3), session),
      priceHint: `Faqat $${entryFrom} — $${entryTo} (≈$${entryMid})`,
      priceFrom: entryFrom,
      priceTo: entryTo,
    };
    stopLoss = round2(res + atrVal * 1.1);
    takeProfit = round2(sup - atrVal * 0.15);
    takeProfit = ensureTakeProfitRR(entryMid, stopLoss, takeProfit, "short", 2);
    exit = {
      title: "CHIQISH (short yopish)",
      whenUz: "TP yoki qo'llab-quvvatlash",
      priceHint: `Maqsad $${takeProfit}`,
      priceFrom: round2(takeProfit - atrVal * 0.15),
      priceTo: round2(takeProfit + atrVal * 0.2),
    };
    situationUz =
      `Swing SHORT: $${price}. Qarshilik $${round2(res)}. RSI ${tech.rsi}. Sabr — signal tasdiq.`;
  } else {
    entry = {
      title: "KIRISH",
      whenUz: "HOZIR KIRMANG — professional trader kutadi",
      priceHint: `Kuzatuv: $${round2(sup)} / $${round2(res)}`,
      priceFrom: round2(sup),
      priceTo: round2(res),
    };
    exit = { title: "CHIQISH", whenUz: "—", priceHint: "—" };
    stopLoss = round2(price - atrVal * 2);
    takeProfit = round2(price + atrVal * 2);
    situationUz =
      `Bozor noaniq. $${price}. Yangiliklar + texnik bir yo'nalish bermaguncha lot OCHMANG.`;
  }

  const entryFrom = entry.priceFrom ?? round2(price - atrVal);
  const entryTo = entry.priceTo ?? round2(price + atrVal);
  const entryMid = round2((entryFrom + entryTo) / 2);
  const exitPrice =
    exit.priceFrom && exit.priceTo
      ? round2((exit.priceFrom + exit.priceTo) / 2)
      : takeProfit;

  const riskPts = Math.abs(entryMid - stopLoss);
  const rewardPts = Math.abs(takeProfit - entryMid);
  const riskReward = riskPts > 0 ? round2(rewardPts / riskPts) : 0;

  const newsConf = na?.confidence ?? 0;
  const confidence = Math.min(90, Math.round(40 + Math.abs(score) * 9 + newsConf * 0.2));
  const confluencePct = Math.min(
    95,
    Math.round(30 + Math.abs(score) * 11 + (na?.newsCandleAligned ? 22 : 0) + (bias !== "wait" ? 10 : 0))
  );

  const gate = applyTradeGate({
    bias,
    news: na,
    riskReward,
    confluencePct,
    confidence,
    techScore: score,
    mode: "longterm",
  });

  const finalBias = gate.effectiveBias;

  let sigEntryFrom = entryFrom;
  let sigEntryTo = entryTo;
  let sigExitPrice = exitPrice;
  let sigSl = stopLoss;
  let sigTp = takeProfit;

  if (finalBias === "wait") {
    const w = waitTradeLevels(price, sup, res, atrVal);
    entry = w.entry;
    exit = w.exit;
    stopLoss = w.stopLoss;
    takeProfit = w.takeProfit;
    sigEntryFrom = w.entryFrom;
    sigEntryTo = w.entryTo;
    sigExitPrice = w.exitPrice;
    sigSl = w.stopLoss;
    sigTp = w.takeProfit;
  }

  const signal = buildSignalDetail(
    price,
    finalBias,
    sigEntryFrom,
    sigEntryTo,
    sigExitPrice,
    sigSl,
    sigTp,
    confidence,
    confluencePct,
    atrVal,
    [],
    gate
  );

  const keyLevels = [
    { label: "SL", price: stopLoss },
    { label: "Kirish", price: signal.entryPrice },
    { label: "TP", price: takeProfit },
    { label: "Past", price: round2(sup) },
    { label: "Yuqori", price: round2(res) },
  ];

  const newsBlock = na
    ? `${na.recommendationUz ?? ""} ${na.trendOutlookUz ?? ""} ${gate.newsVerdictUz}`
    : "Yangiliklar tahlili kutilmoqda — savdo ochmang.";

  const dollarNote = dollar
    ? `DXY ${dollar.changePercent >= 0 ? "+" : ""}${dollar.changePercent.toFixed(2)}% — oltin uchun ${dollar.changePercent > 0.2 ? "salbiy korrelyatsiya" : dollar.changePercent < -0.2 ? "qo'llab-quvvat" : "neytral"}.`
    : "";

  const playbookUz =
    finalBias === "long"
      ? `SWING LONG PLAYBOOK: Likvidlik yig'ish $${round2(sup)} atrofida → impuls $${round2(res)} ga. Faqat MOS yangilik + R:R≥2. Qisman TP qarshilikda, qolgani trailing.`
      : finalBias === "short"
        ? `SWING SHORT PLAYBOOK: Qarshilik rad etish $${round2(res)} → maqsad $${round2(sup)}. Makro salbiy tasdiq bo'lmaguncha qo'shimcha lot yo'q.`
        : `CAPITAL PRESERVATION: Range $${round2(sup)}–$${round2(res)}. Breakout + retest + yangiliklar tasdiqlanguncha pozitsiya yo'q.`;

  const tacticsUz: string[] =
    finalBias === "long"
      ? [
          `Kirish faqat $${entry.priceFrom}–$${entry.priceTo} retestda, market emas limit.`,
          `SL $${stopLoss} — kunlik yopilish ostida; hech qachon SL ni kengaytirmang.`,
          `TP $${takeProfit} (R:R ${riskReward}) — 50% qisman, qolgani breakeven.`,
          `RSI ${tech.rsi}: ${tech.rsi > 65 ? "yuqori — faqat qisqa tuzatishda kirish" : "normal zona"}.`,
          dollarNote || "DXY kuzatuvda.",
          na?.tradeVerdictUz?.slice(0, 90) ?? "Yangiliklar paneli bilan sinxron.",
        ]
      : finalBias === "short"
        ? [
            `Short faqat $${entry.priceFrom}–$${entry.priceTo} rad zonasida.`,
            `SL $${stopLoss} yuqorida qat'iy; gap xavfi uchun lot kichik.`,
            `TP $${takeProfit}, R:R ${riskReward}. 30% foyda oling, qolgani trailing.`,
            `Trend ${tech.trend}, momentum: ${tech.momentum.slice(0, 60)}.`,
            dollarNote || "DXY kuzatuvda.",
            gate.reasonUz.slice(0, 90),
          ]
        : [
            "Hozir: NO TRADE — professional kutish.",
            `Kuzatuv: qarshilik $${round2(res)} sinovi, qo'llab $${round2(sup)} ushlanishi.`,
            "Yangiliklar zid bo'lsa 24 soat kutish.",
            `Konfluens ${confluencePct}% — minimal 65% talab.`,
            dollarNote || "Makro omillar kutilmoqda.",
            na?.contradictionsUz?.slice(0, 90) ?? "Signal yo'qligi — sabr.",
          ];

  return {
    bias: finalBias,
    horizonUz: "1 hafta — 4 hafta (swing)",
    confidence,
    situationUz: `${playbookUz} ${gate.capitalRuleUz} ${newsBlock} ${signal.oneLineUz} ${situationUz}`,
    entry,
    exit,
    stopLoss,
    takeProfit,
    invalidationUz:
      finalBias === "long"
        ? `Narx $${stopLoss} dan past kunlik yopilish — STOP, zarar cheklangan.`
        : finalBias === "short"
          ? `Narx $${stopLoss} dan yuqori — short bekor.`
          : gate.reasonUz,
    technical: tech,
    signal,
    keyLevels,
    playbookUz,
    tacticsUz,
  };
}
