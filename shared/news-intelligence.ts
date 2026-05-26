import type {
  Candle,
  MarketQuote,
  NewsItem,
  NewsMarketAnalysis,
  NewsFactor,
  TechnicalAnalysis,
} from "./types";
import { analyzeTechnicals } from "./technical";

type Sentiment = "bullish" | "bearish" | "neutral";

interface FactorRule {
  id: string;
  nameUz: string;
  horizonUz: string;
  patterns: RegExp[];
  bull: RegExp[];
  bear: RegExp[];
}

const FACTOR_RULES: FactorRule[] = [
  {
    id: "fed",
    nameUz: "Fed va foiz stavkalari",
    horizonUz: "1–4 hafta",
    patterns: [/fed|fomc|powell|interest rate|rate cut|rate hike|monetary/i],
    bull: [/rate cut|dovish|pause|easing|lower rates/i],
    bear: [/rate hike|hawkish|higher for longer|tightening/i],
  },
  {
    id: "inflation",
    nameUz: "Inflyatsiya CPI/PPI",
    horizonUz: "1–2 hafta",
    patterns: [/cpi|ppi|inflation|stagflation|pce/i],
    bull: [/hot cpi|high inflation|inflation rise|sticky inflation/i],
    bear: [/cooling inflation|inflation fall|disinflation/i],
  },
  {
    id: "dollar",
    nameUz: "Dollar indeksi DXY",
    horizonUz: "kun–hafta",
    patterns: [/dollar|dxy|usd index|greenback|treasury yield/i],
    bull: [/weak dollar|dollar fall|dollar drop|yields fall|yield decline/i],
    bear: [/strong dollar|dollar rise|dollar surge|yields rise|yield spike/i],
  },
  {
    id: "geopolitics",
    nameUz: "Geosiyosik xavf",
    horizonUz: "kun–oy",
    patterns: [/war|conflict|attack|sanction|geopolit|middle east|ukraine|iran|israel/i],
    bull: [/escalat|tension|crisis|safe haven|uncertainty|strike|invasion/i],
    bear: [/ceasefire|peace|de-escalat|deal reached/i],
  },
  {
    id: "central_bank_gold",
    nameUz: "Markaziy banklar oltin xaridi",
    horizonUz: "oy–yil",
    patterns: [/central bank|reserve|gold buying|bullion demand|brics gold/i],
    bull: [/buying gold|gold reserves|accumulat|record purchase/i],
    bear: [/selling gold|reserve drop/i],
  },
  {
    id: "etf_flows",
    nameUz: "ETF va institutsional talab",
    horizonUz: "1–2 hafta",
    patterns: [/etf|gld|institutional|inflow|outflow|fund flow/i],
    bull: [/inflow|record holding|demand surge/i],
    bear: [/outflow|redemption|selling etf/i],
  },
  {
    id: "direct_gold",
    nameUz: "To'g'ridan-to'g'ri oltin bozori",
    horizonUz: "kun–hafta",
    patterns: [/gold price|xau|bullion|comex|spot gold|precious metal/i],
    bull: [/gold surge|gold rally|record high|gold rise|safe haven/i],
    bear: [/gold fall|gold drop|gold plunge|profit.?taking/i],
  },
  {
    id: "recession",
    nameUz: "Iqtisodiy tormoz / recession",
    horizonUz: "hafta–oy",
    patterns: [/recession|slowdown|crisis|default|bank fail|stimulus/i],
    bull: [/recession fear|stimulus|easing|safe haven|crisis/i],
    bear: [/strong gdp|soft landing|recovery|growth beat/i],
  },
];

function scoreItem(text: string): { sentiment: Sentiment; score: number; impact: "high" | "medium" | "low" } {
  const t = text.toLowerCase();
  let score = 0;
  const bullHits =
    (t.match(/surge|rally|rise|bull|safe haven|rate cut|weak dollar|buying|record high|inflow|escalat/gi) ?? [])
      .length;
  const bearHits =
    (t.match(/fall|drop|bear|plunge|rate hike|strong dollar|outflow|peace|ceasefire|profit.?taking/gi) ?? [])
      .length;
  score = bullHits - bearHits;
  const breaking = /breaking|urgent|crisis|war|attack|emergency|surge|plunge|record/i.test(t);
  const impact: "high" | "medium" | "low" = breaking ? "high" : Math.abs(score) >= 2 ? "medium" : "low";
  const sentiment: Sentiment = score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";
  return { sentiment, score, impact };
}

function analyzeFactors(items: NewsItem[]): NewsFactor[] {
  const factors: NewsFactor[] = [];

  for (const rule of FACTOR_RULES) {
    let bull = 0;
    let bear = 0;
    const matched: string[] = [];

    for (const item of items) {
      const text = `${item.title} ${item.summary} ${item.titleUz ?? ""} ${item.summaryUz ?? ""}`;
      if (!rule.patterns.some((p) => p.test(text))) continue;
      matched.push(item.titleUz ?? item.title);
      if (rule.bull.some((p) => p.test(text))) bull++;
      if (rule.bear.some((p) => p.test(text))) bear++;
    }

    if (matched.length === 0) continue;

    let direction: NewsFactor["direction"] = "mixed";
    if (bull > bear + 1) direction = "bullish";
    else if (bear > bull + 1) direction = "bearish";

    const weight = Math.min(10, Math.round(3 + matched.length + Math.abs(bull - bear) * 1.5));

    factors.push({
      id: rule.id,
      nameUz: rule.nameUz,
      direction,
      weight,
      horizonUz: rule.horizonUz,
      explanationUz:
        direction === "bullish"
          ? `${matched.length} ta yangilik oltin uchun ijobiy: ${rule.nameUz} · bull ${bull}, bear ${bear}.`
          : direction === "bearish"
            ? `${matched.length} ta yangilik oltin uchun salbiy bosim: ${rule.nameUz}.`
            : `${matched.length} ta yangilik aralash signal beradi — ehtiyotkor bo'ling.`,
      relatedHeadlines: matched.slice(0, 3),
    });
  }

  return factors.sort((a, b) => b.weight - a.weight);
}

function candleNewsAlignment(
  tech: TechnicalAnalysis,
  newsBias: Sentiment,
  price: number
): { textUz: string; aligned: boolean; score: number } {
  const techBias: Sentiment =
    tech.trend === "bullish" ? "bullish" : tech.trend === "bearish" ? "bearish" : "neutral";

  const aligned = techBias === newsBias && newsBias !== "neutral";
  const conflict = techBias !== "neutral" && newsBias !== "neutral" && techBias !== newsBias;

  let textUz = `Shamlardan: trend ${tech.trend}, RSI ${tech.rsi}, SMA20 $${tech.sma20}, SMA50 $${tech.sma50}. `;
  textUz += tech.momentum + ". ";

  if (aligned) {
    textUz += `Yangiliklar va shamlarning yo'nalishi MOS — ishonch oshadi. Hozirgi narx $${price}.`;
    return { textUz, aligned: true, score: 12 };
  }
  if (conflict) {
    textUz +=
      `DIQQAT: Yangiliklar (${newsBias}) va shamlar (${techBias}) ZID — signalni tasdiqlamang, kuting yoki kichik lot.`;
    return { textUz, aligned: false, score: -15 };
  }
  textUz += `Yangiliklar ${newsBias}, texnik ${techBias} — to'liq moslik yo'q, qo'shimcha tasdiq kerak.`;
  return { textUz, aligned: false, score: 0 };
}

export function computeNewsIntelligence(
  news: NewsItem[],
  price: number,
  candles: Candle[],
  drivers: MarketQuote[],
  multiCandles?: Partial<Record<string, Candle[]>>
): NewsMarketAnalysis {
  const seen = new Set<string>();
  const items = news
    .filter((n) => {
      const key = (n.titleUz ?? n.title).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40);
  const tech = analyzeTechnicals(candles.length ? candles : [{ time: 0, open: price, high: price, low: price, close: price }]);

  let totalScore = 0;
  let bullCount = 0;
  let bearCount = 0;
  const itemInsights: NewsMarketAnalysis["itemInsights"] = [];

  for (const item of items) {
    const text = `${item.title} ${item.summary} ${item.titleUz ?? ""} ${item.summaryUz ?? ""}`;
    const { sentiment, score, impact } = scoreItem(text);
    totalScore += score * (impact === "high" ? 2 : impact === "medium" ? 1.2 : 0.7);
    if (sentiment === "bullish") bullCount++;
    else if (sentiment === "bearish") bearCount++;

    let impactUz = item.goldImpactUz ?? "";
    if (!impactUz) {
      if (sentiment === "bullish")
        impactUz = "Oltin uchun ijobiy: talab oshishi yoki dollar zaiflashishi mumkin.";
      else if (sentiment === "bearish")
        impactUz = "Oltin uchun salbiy: realizatsiya yoki dollar kuchayishi mumkin.";
      else impactUz = "Bevosita ta'sir aniq emas — kontekstda kuzating.";
    }

    itemInsights.push({
      newsId: item.id,
      titleUz: item.titleUz ?? item.title,
      sentiment,
      impact,
      impactUz,
      stream: item.stream ?? "direct",
    });
  }

  const futureFactors = analyzeFactors(items);

  let overallBias: NewsMarketAnalysis["overallBias"] = "neutral";
  if (totalScore >= 5 || bullCount >= bearCount + 6) overallBias = "bullish";
  else if (totalScore <= -5 || bearCount >= bullCount + 6) overallBias = "bearish";

  const biasStrength = Math.min(
    100,
    Math.round(30 + Math.abs(totalScore) * 4 + Math.max(bullCount, bearCount) * 2)
  );

  const candleAlign = candleNewsAlignment(tech, overallBias, price);

  const dollar = drivers.find((d) => d.name.toLowerCase().includes("dollar"));
  let driverNote = "";
  if (dollar) {
    driverNote =
      dollar.changePercent > 0.15
        ? `Dollar kuchaymoqda ${dollar.changePercent.toFixed(2)}% — oltin uchun bosim. `
        : dollar.changePercent < -0.15
          ? `Dollar zaiflashmoqda — oltin uchun qo'llab-quvvat. `
          : "";
  }

  const tfNotes: string[] = [];
  if (multiCandles) {
    for (const [tf, cs] of Object.entries(multiCandles)) {
      if (!cs?.length) continue;
      const t = analyzeTechnicals(cs);
      tfNotes.push(`${tf}: ${t.trend}, RSI ${t.rsi}`);
    }
  }

  const contradictions: string[] = [];
  if (!candleAlign.aligned && candleAlign.score < 0) contradictions.push(candleAlign.textUz);
  const bullFactors = futureFactors.filter((f) => f.direction === "bullish").length;
  const bearFactors = futureFactors.filter((f) => f.direction === "bearish").length;
  if (bullFactors >= 2 && bearFactors >= 2)
    contradictions.push(
      `Zid omillar: ${bullFactors} ijobiy va ${bearFactors} salbiy faktor bir vaqtda — bozor aralash.`
    );

  const risksUz: string[] = [];
  const opportunitiesUz: string[] = [];

  if (overallBias === "bullish") {
    opportunitiesUz.push("Yangiliklar oltinni qo'llab-quvvatlaydi — uzoq pozitsiya yoki qisqa long.");
    if (tech.rsi > 68) risksUz.push("RSI yuqori — yangiliklar ijobiy bo'lsa ham qisqa tuzatish mumkin.");
  } else if (overallBias === "bearish") {
    risksUz.push("Makro/yangiliklar oltin pastga bosishi mumkin — long ehtiyotkor.");
    opportunitiesUz.push("Qisqa muddat short yoki kutish mantiqiy.");
  } else {
    risksUz.push("Yangiliklar aniq yo'nalish bermaydi — katta lot ochmang.");
  }

  if (items.some((i) => i.alert))
    risksUz.push("Shoshilinch yangiliklar bor — spread kengayishi va gap xavfi.");

  for (const f of futureFactors.slice(0, 4)) {
    if (f.direction === "bullish") opportunitiesUz.push(`${f.nameUz}: ${f.explanationUz}`);
    else if (f.direction === "bearish") risksUz.push(`${f.nameUz}: ${f.explanationUz}`);
  }

  const narrativeUz =
    `Bozor muhokamasi (${items.length} ta yangilik tahlil qilindi). ` +
    `Umumiy ton: ${overallBias === "bullish" ? "OLTIN UCHUN IJOBIY" : overallBias === "bearish" ? "OLTIN UCHUN SALBIY" : "NEYTRAL / ARALASH"} ` +
    `(kuch ${biasStrength}%). ${driverNote}` +
    `Bull yangiliklar: ${bullCount}, bear: ${bearCount}. ` +
    `Asosiy kelajak omillari: ${futureFactors.slice(0, 3).map((f) => f.nameUz).join(", ") || "aniqlanmadi"}. ` +
    candleAlign.textUz +
    (tfNotes.length ? ` Multi-TF: ${tfNotes.join("; ")}.` : "");

  const trendOutlookUz =
    overallBias === "bullish"
      ? `Tendensiya: yuqoriga moyil. Yangiliklar va ${candleAlign.aligned ? "shamlar mos" : "shamlar to'liq mos emas"}. ` +
        `Maqsad zonasi qarshilik $${tech.resistance[0] ?? price + 20} atrofida.`
      : overallBias === "bearish"
        ? `Tendensiya: pastga moyil. Qo'llab-quvvatlash $${tech.support[0] ?? price - 20} sinovi muhim.`
        : `Tendensiya noaniq. Yangiliklar va texnik bir xil emas — faqat aniq zona va signal kuting.`;

  const recommendationUz =
    contradictions.length > 0
      ? `TAVSIYA: HOZIR KIRMANG. Zid signal: ${contradictions[0]} Professional trader bu paytda kutadi.`
      : overallBias === "bullish" && biasStrength >= 45
        ? candleAlign.aligned
          ? "TAVSIYA: LONG moyil — yangiliklar + sham MOS, SL majburiy."
          : "TAVSIYA: LONG ehtiyotkor — yangiliklar bullish, TF tasdiqini kuting."
        : overallBias === "bearish" && biasStrength >= 45
          ? candleAlign.aligned
            ? "TAVSIYA: SHORT moyil — yangiliklar + sham MOS, SL qat'iy."
            : "TAVSIYA: SHORT ehtiyotkor — yangiliklar bearish, TF tasdiqini kuting."
          : items.length < 5
            ? "TAVSIYA: Yangiliklar kam — faqat kuchli TF setupda kiring."
            : "TAVSIYA: Neytral — uzoq HOLD, yaqin faqat TF mos bo'lsa.";

  const confidence = Math.min(
    98,
    Math.round(
      biasStrength * 0.65 +
        (candleAlign.aligned ? 22 : 0) +
        (contradictions.length === 0 ? 8 : -15) +
        Math.min(12, Math.abs(totalScore) * 2)
    )
  );

  const tradeVerdictUz =
    contradictions.length > 0
      ? `HUKM: KUTING — ${contradictions[0].slice(0, 90)}`
      : overallBias === "bullish" && biasStrength >= 45
        ? `HUKM: LONG moyil (${biasStrength}%) — swing yoki TF tasdiq`
        : overallBias === "bearish" && biasStrength >= 45
          ? `HUKM: SHORT moyil (${biasStrength}%) — swing yoki TF tasdiq`
          : `HUKM: NEYTRAL — ${items.length} yangilik, ishonch ${confidence}%`;

  const forecastUz =
    `${overallBias === "bullish" ? "▲" : overallBias === "bearish" ? "▼" : "◆"} 24–72s: ` +
    trendOutlookUz.slice(0, 100) +
    (futureFactors[0] ? ` | Omil: ${futureFactors[0].nameUz}` : "");

  return {
    updatedAt: new Date().toISOString(),
    overallBias,
    biasStrength,
    narrativeUz,
    trendOutlookUz,
    candleAlignmentUz: candleAlign.textUz,
    newsCandleAligned: candleAlign.aligned,
    futureFactors,
    risksUz,
    opportunitiesUz,
    contradictionsUz: contradictions.length ? contradictions.join(" ") : null,
    headlineSummaryUz: `Oxirgi ${Math.min(8, items.length)} sarlavha: ` +
      items
        .slice(0, 8)
        .map((i) => (i.titleUz ?? i.title).slice(0, 50))
        .join(" · "),
    itemInsights: itemInsights.slice(0, 25),
    confidence,
    recommendationUz,
    tradeVerdictUz,
    forecastUz,
    newsScore: totalScore,
    bullCount,
    bearCount,
  };
}
