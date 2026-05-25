import type { LongTermStrategy, NewsMarketAnalysis, TechnicalAnalysis } from "./types";

export const SYSTEM_NEWS_ANALYST = `Siz XAUUSD oltin bozori BOSH ANALITIK va professional savdogarsiz.
ASOSIY MAQSAD: har bir yangilikni oltin narxiga ta'sirini baholash — savdogar shu asosida qaror qiladi.
QAT'IY: Kapital himoyasi — zid yoki noaniq fon bo'lsa recommendationUz da "KIRMANG" deb yozing.
Yangiliklar + shamlar MOS bo'lmaguncha agressiv tavsiya bermang.
Fed, dollar, inflyatsiya, geosiyosat, ETF — har birini alohida muhokama qiling.
O'zbek tilida, aniq. JSON formatida javob.`;

export const SYSTEM_ANALYST = `Siz XAUUSD professional swing murabbiyisiz (1 hafta — 1 oy).
FOYDALANUVCHI haqiqiy trader: zarar kamaytirish, har lotda R:R ≥ 1:2, haftada 0–1 savdo.

QAT'IY:
- BUY, SELL, HOLD, WAIT ISHLATMANG
- Noaniq bo'lsa bias=wait
- stopLoss va takeProfit raqamli — TP har doim SL dan kamida 2 barobar uzoq
- riskWarning da kapital himoyasi
- JSON formatida javob`;

export const SYSTEM_TRANSLATOR = `Siz oltin bozori yangiliklari tarjimoni. O'zbek tiliga tarjima. JSON massiv.`;

export function buildTranslatePrompt(
  articles: { id: string; title: string; summary: string }[]
): string {
  const list = articles
    .map((a, i) => `[${i + 1}] id="${a.id}"\n${a.title}\n${a.summary.slice(0, 220)}`)
    .join("\n\n");
  return `Oltin yangiliklari — o'zbekcha:\n${list}\n\nJSON:\n[{"id":"...","titleUz":"...","summaryUz":"...","goldImpactUz":"..."}]`;
}

export function buildForecastPrompt(
  price: number,
  change: number,
  changePercent: number,
  high24h: number | undefined,
  low24h: number | undefined,
  tech: TechnicalAnalysis,
  base: LongTermStrategy,
  news: { title: string; summary: string }[],
  newsBrief?: string
): string {
  const newsBlock = news.slice(0, 12).map((n, i) => `${i + 1}. ${n.title}`).join("\n");
  return `XAUUSD UZOQ MUDDATLI TAHLIL
Hozir: $${price} (${changePercent}%)
24s: ${low24h ?? "?"} — ${high24h ?? "?"}

TEXNIK: RSI ${tech.rsi}, trend ${tech.trend}, SMA20 ${tech.sma20}, SMA50 ${tech.sma50}
Qo'llab: ${tech.support.join(", ")} | Qarshi: ${tech.resistance.join(", ")}
${tech.momentum}

AVTO-REJA (bias ${base.bias}):
Kirish: ${base.entry.whenUz} | ${base.entry.priceHint}
Chiqish: ${base.exit.whenUz} | ${base.exit.priceHint}
SL ${base.stopLoss} TP ${base.takeProfit}

YANGILIKLAR MUHOKAMASI:
${newsBrief ?? "—"}

SARLAVHALAR:
${newsBlock}

Foydalanuvchi uchun JSON (BUY/SELL/HOLD/WAIT YO'Q — faqat long|short|wait):
{
  "bias": "long"|"short"|"wait",
  "horizonUz": "masalan 2-4 hafta",
  "confidence": 0-100,
  "situationUz": "5-8 jumlalik to'liq vaziyat — nima bo'layapti, nima kutish kerak",
  "entry": {"title":"KIRISH ...","whenUz":"aniq kun va soat","priceHint":"aniq narx zonasi","priceFrom":number,"priceTo":number},
  "exit": {"title":"CHIQISH ...","whenUz":"...","priceHint":"...","priceFrom":number,"priceTo":number},
  "stopLoss": number,
  "takeProfit": number,
  "invalidationUz": "reja bekor bo'lish sharti",
  "weekPlanUz": "haftalik reja: dushanba nima, juma nima",
  "keyFactors": ["string"],
  "riskWarning": "string",
  "summaryUz": "2-3 jumlalik xulosa"
}`;
}

export function buildNewsDeepAnalysisPrompt(
  price: number,
  changePercent: number,
  tech: TechnicalAnalysis,
  baseAnalysis: NewsMarketAnalysis,
  news: { title: string; summary: string; stream?: string }[]
): string {
  const newsBlock = news
    .slice(0, 22)
    .map((n, i) => `[${i + 1}] (${n.stream ?? "?"}) ${n.title}\n${n.summary.slice(0, 280)}`)
    .join("\n\n");

  const factors = baseAnalysis.futureFactors
    .map((f) => `- ${f.nameUz}: ${f.direction}, ${f.explanationUz}`)
    .join("\n");

  return `XAUUSD YANGILIKLAR VA BOZOR CHUQUR MUHOKAMASI

NARX: $${price} (${changePercent}%)
TEXNIK (qo'shimcha): RSI ${tech.rsi}, trend ${tech.trend}, ${tech.momentum}
AVTOMATIK TAHLIL: bias ${baseAnalysis.overallBias}, kuch ${baseAnalysis.biasStrength}%
Bull ${baseAnalysis.bullCount} / Bear ${baseAnalysis.bearCount}
OMILLAR:
${factors || "—"}

BARCHA YANGILIKLAR (to'liq o'qing va muhokama qiling):
${newsBlock}

Vazifa: har bir muhim voqeani oltin narxiga ta'sirini tushuntiring, tendensiya, kelajak 1-4 hafta.
JSON:
{
  "aiDiscussionUz": "8-15 jumlalik to'liq muhokama — nima bo'lyapti, nima kutish, qaysi yangilik eng muhim",
  "aiFutureOutlookUz": "kelajakda narxga ta'sir: Fed, dollar, urush, inflyatsiya, ETF — 5-8 jumla",
  "overallBias": "bullish"|"bearish"|"neutral",
  "biasStrength": 0-100,
  "trendOutlookUz": "tendensiya xulosasi",
  "recommendationUz": "savdogar uchun aniq tavsiya — adashmaslik uchun",
  "contradictionsUz": "zidliklar yoki null",
  "keyRisks": ["string"],
  "keyOpportunities": ["string"]
}`;
}
