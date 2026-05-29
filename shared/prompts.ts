import type { NewsMarketAnalysis, TechnicalAnalysis } from "./types";
import type { AiTradeSignal } from "./ai-trade-signal";

export const SYSTEM_NEWS_ANALYST = `Siz XAUUSD oltin bozori BOSH ANALITIK va professional savdogarsiz.
ASOSIY MAQSAD: har bir yangilikni oltin narxiga ta'sirini baholash — savdogar shu asosida qaror qiladi.
QAT'IY: Kapital himoyasi — zid yoki noaniq fon bo'lsa recommendationUz da "KIRMANG" deb yozing.
Yangiliklar + shamlar MOS bo'lmaguncha agressiv tavsiya bermang.
Fed, dollar, inflyatsiya, geosiyosat, ETF — har birini alohida muhokama qiling.
tradeVerdictUz: bir qatorda aniq HUKM (LONG/SHORT/KUTING) va narx zonasi.
aiFutureOutlookUz: 24 soat, 72 soat, 1 hafta — alohida jumlalar.
O'zbek tilida, aniq. JSON formatida javob.`;

export const SYSTEM_TRANSLATOR = `Siz XAUUSD oltin bozori yangiliklari professional tarjimoni.
HAR BIR sarlavha va qisqacha matn TO'LIQ O'ZBEK TILIDA bo'lsin — inglizcha qoldirmang.
goldImpactUz: oltin narxiga ta'sir 1 jumlada (bullish/bearish/neutral).
JSON massiv qaytaring.`;

export const SYSTEM_AI_TRADE_SIGNAL = `Siz XAUUSD SWING / intraday mutaxassisisiz.
Maqsad: KATTA harakat — kamida 50 pip ($5), ideal 70–100 pip ($7–$10) foyda.

QAT'IY:
- Faqat JSON — action: BUY | SELL | HOLD
- BUY/SELL faqat aniq trend + 50+ pip joy bo'lsa; aks holda HOLD
- takeProfit: entry dan kamida $5 (50 pip), ko'pi $10 (100 pip) gacha
- stopLoss: $2–$4 (20–40 pip), R:R min 1:1.5
- Jonli momentum teskari bo'lsa HOLD
- RSI<38 SELL taqiq, RSI>62 BUY taqiq
- 3–5 pip skalp TP bermang — faqat katta maqsad
- O'zbek tilida`;

export function buildTranslatePrompt(
  articles: { id: string; title: string; summary: string }[]
): string {
  const list = articles
    .map((a, i) => `[${i + 1}] id="${a.id}"\n${a.title}\n${a.summary.slice(0, 220)}`)
    .join("\n\n");
  return `Oltin yangiliklari — o'zbekcha:\n${list}\n\nJSON:\n[{"id":"...","titleUz":"...","summaryUz":"...","goldImpactUz":"..."}]`;
}

export function buildAiTradeSignalPrompt(input: {
  price: number;
  changePercent: number;
  high24h?: number;
  low24h?: number;
  tech: TechnicalAnalysis;
  tech5m?: TechnicalAnalysis;
  m1ScalpBlock?: string;
  liveMomentumBlock?: string;
  swingTargetBlock?: string;
  newsAnalysis: NewsMarketAnalysis | null;
  newsTitles: string[];
  drivers: { name: string; changePercent: number }[];
  calendarHint?: string;
  disciplineScore?: number;
}): string {
  const na = input.newsAnalysis;
  const newsBlock = input.newsTitles.slice(0, 18).map((t, i) => `${i + 1}. ${t}`).join("\n");

  const t5 = input.tech5m ?? input.tech;

  return `XAUUSD — SWING SIGNAL (50–100 pip maqsad, aniq bo'lsa)

NARX HOZIR: $${input.price} (${input.changePercent}%)
24s: ${input.low24h ?? "?"} — ${input.high24h ?? "?"}

${input.m1ScalpBlock ?? "M1 skalp: ma'lumot yetarli emas — ehtiyotkor HOLD"}

${input.liveMomentumBlock ?? ""}

${input.swingTargetBlock ?? ""}

TEXNIK M1 (asosiy):
- Trend: ${input.tech.trend}, RSI ${input.tech.rsi}, ADX ${input.tech.adx}
- SMA20 ${input.tech.sma20}, SMA50 ${input.tech.sma50}
- Qo'llab-quvvatlash: ${input.tech.support.slice(0, 3).join(", ")}
- Qarshilik: ${input.tech.resistance.slice(0, 3).join(", ")}
- ${input.tech.momentum}

TEXNIK 5m (filter):
- Trend: ${t5.trend}, RSI ${t5.rsi}, ADX ${t5.adx}

YANGILIKLAR (ikkinchi daraja — M1 zid bo'lsa e'tiborsiz):
${na ? `Bias: ${na.overallBias} ${na.biasStrength}%, ishonch ${na.confidence}%
Hukm: ${na.tradeVerdictUz ?? na.recommendationUz}
${na.aiDiscussionUz ?? na.recommendationUz}` : "Yangiliklar tahlili hali tayyor emas"}

DRIVERLAR: ${input.drivers.map((d) => `${d.name} ${d.changePercent}%`).join(" · ") || "—"}
KALENDAR: ${input.calendarHint ?? "—"}
DISCIPLINE: ${input.disciplineScore ?? "—"}/100

SARLAVHALAR:
${newsBlock}

JSON (faqat shu format):
{
  "action": "BUY"|"SELL"|"HOLD",
  "entry": number,
  "stopLoss": number,
  "takeProfit": number,
  "confidence": 0-100,
  "riskReward": number,
  "analysisUz": "6-10 jumlalik tahlil — nima ko'ryapsiz, nima qilish",
  "triggerUz": "1-2 jumla — qachon va qanday kirish (aniq narx)",
  "invalidationUz": "qaysi narxda reja bekor",
  "summaryUz": "1 jumlalik xulosa"
}`;
}

export function parseAiTradeSignalJson(text: string, currentPrice: number): AiTradeSignal {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI javobida JSON topilmadi");
  const raw = JSON.parse(match[0]) as Record<string, unknown>;
  const action = String(raw.action ?? "HOLD").toUpperCase();
  if (action !== "BUY" && action !== "SELL" && action !== "HOLD") {
    throw new Error("action BUY, SELL yoki HOLD bo'lishi kerak");
  }

  const entry = Number(raw.entry);
  const stopLoss = Number(raw.stopLoss);
  const takeProfit = Number(raw.takeProfit);
  if (![entry, stopLoss, takeProfit].every((n) => Number.isFinite(n) && n > 100)) {
    throw new Error("entry, stopLoss, takeProfit raqam bo'lishi kerak");
  }

  if (action === "BUY") {
    if (!(stopLoss < entry && entry < takeProfit)) {
      throw new Error("BUY: stopLoss < entry < takeProfit bo'lishi kerak");
    }
  } else if (action === "SELL") {
    if (!(takeProfit < entry && entry < stopLoss)) {
      throw new Error("SELL: takeProfit < entry < stopLoss bo'lishi kerak");
    }
  }

  let riskReward = Number(raw.riskReward);
  if (!Number.isFinite(riskReward)) {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    riskReward = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;
  }
  if (action !== "HOLD" && riskReward < 1.4) {
    throw new Error(`Risk/reward ${riskReward} juda past (min 1.4)`);
  }

  return {
    action,
    entry: Math.round(entry * 100) / 100,
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit: Math.round(takeProfit * 100) / 100,
    confidence: Math.min(100, Math.max(0, Math.round(Number(raw.confidence) || 50))),
    riskReward,
    currentPrice: Math.round(currentPrice * 100) / 100,
    analysisUz: String(raw.analysisUz ?? "").slice(0, 1200),
    triggerUz: String(raw.triggerUz ?? "").slice(0, 300),
    invalidationUz: String(raw.invalidationUz ?? "").slice(0, 300),
    summaryUz: String(raw.summaryUz ?? "").slice(0, 400),
    createdAt: new Date().toISOString(),
  };
}

/** @deprecated eski forecast */
export const SYSTEM_ANALYST = SYSTEM_AI_TRADE_SIGNAL;

export function buildForecastPrompt(): string {
  return "";
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
  "tradeVerdictUz": "bir qatorli HUKM: LONG|SHORT|KUTING + narx",
  "contradictionsUz": "zidliklar yoki null",
  "keyRisks": ["string"],
  "keyOpportunities": ["string"]
}`;
}
