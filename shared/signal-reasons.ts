import type { AiTradeSignal, AiTradeAction } from "./ai-trade-signal";
import type {
  TechnicalAnalysis,
  NewsMarketAnalysis,
  PriceData,
} from "./types";
import type { SetupQuality } from "./setup-quality";
import type { M1ScalpLead } from "./m1-scalp";
import type { LiveMomentum } from "./scalp-signal-guard";

export type ReasonStance = "pro" | "con" | "neutral";

export interface SignalReason {
  /** Qisqa faktik sarlavha, masalan "RSI 62 — kuchli" */
  labelUz: string;
  /** Aniq raqam yoki qiymat */
  valueUz: string;
  /** Signal yo'nalishini qo'llab-quvvatlaydimi yoki qarshimi */
  stance: ReasonStance;
}

export interface SignalReasoning {
  action: AiTradeAction;
  /** Bir jumlalik umumiy asos */
  headlineUz: string;
  /** Qo'llab-quvvatlovchi faktlar soni */
  proCount: number;
  /** Qarshi faktlar soni */
  conCount: number;
  reasons: SignalReason[];
}

interface Input {
  signal: AiTradeSignal | null;
  technical?: TechnicalAnalysis | null;
  news?: NewsMarketAnalysis | null;
  setup?: SetupQuality | null;
  gold?: PriceData | null;
  m1Scalp?: M1ScalpLead | null;
  liveMomentum?: LiveMomentum | null;
}

/** Signal yo'nalishiga nisbatan biasni pro/con ga aylantiradi */
function biasStance(
  bias: "bullish" | "bearish" | "neutral" | undefined,
  action: AiTradeAction
): ReasonStance {
  if (!bias) return "neutral";
  if (action === "HOLD") return bias === "neutral" ? "pro" : "con";
  if (bias === "neutral") return "neutral";
  if (action === "BUY") return bias === "bullish" ? "pro" : "con";
  return bias === "bearish" ? "pro" : "con";
}

function trendUz(t: "bullish" | "bearish" | "neutral"): string {
  return t === "bullish" ? "yuqoriga" : t === "bearish" ? "pastga" : "yon";
}

function biasUz(b: "bullish" | "bearish" | "neutral"): string {
  return b === "bullish" ? "ko'tarilish" : b === "bearish" ? "tushish" : "neytral";
}

/**
 * Signal (BUY/SELL/HOLD) nima uchun berilganini faktlar asosida tushuntiradi.
 * AI matniga tayanmaydi — jonli texnik, yangilik va setup raqamlaridan quriladi.
 */
export function buildSignalReasoning(input: Input): SignalReasoning | null {
  const { signal, technical, news, setup, gold, m1Scalp, liveMomentum } = input;
  if (!signal) return null;
  const action = signal.action;
  const mode = signal.mode ?? "swing";
  const reasons: SignalReason[] = [];

  // Rejim — scalp vs swing asoslari
  if (mode === "scalp") {
    if (m1Scalp) {
      const dir = m1Scalp.direction === "long" ? "bullish" : m1Scalp.direction === "short" ? "bearish" : "neutral";
      reasons.push({
        labelUz: `M1 skalp: ${m1Scalp.direction.toUpperCase()} ${m1Scalp.strength}% · ${m1Scalp.phase}`,
        valueUz: m1Scalp.structureUz,
        stance: biasStance(dir as "bullish" | "bearish" | "neutral", action),
      });
    }
    if (liveMomentum) {
      const liveBias =
        liveMomentum.direction === "up" ? "bullish" : liveMomentum.direction === "down" ? "bearish" : "neutral";
      reasons.push({
        labelUz: `Jonli momentum: ${liveMomentum.summaryUz}`,
        valueUz: `$${liveMomentum.changeUsd}`,
        stance: biasStance(liveBias, action),
      });
    }
    if (signal.holdTimeUz) {
      reasons.push({
        labelUz: `Tez savdo — ushlab turish ${signal.holdTimeUz}`,
        valueUz: signal.holdTimeUz,
        stance: action === "HOLD" ? "neutral" : "pro",
      });
    }
  } else {
    if (signal.panelUz) {
      reasons.push({
        labelUz: `Swing panel: ${signal.panelUz}`,
        valueUz: signal.modeLabelUz ?? "UZOQ MUDDAT",
        stance: action === "HOLD" ? "neutral" : "pro",
      });
    }
    if (signal.confluencePct != null) {
      reasons.push({
        labelUz: `TF moslik (5m/15m/1h) ${signal.confluencePct}%`,
        valueUz: `${signal.confluencePct}%`,
        stance: signal.confluencePct >= 55 ? "pro" : signal.confluencePct >= 40 ? "neutral" : "con",
      });
    }
    if (signal.holdTimeUz) {
      reasons.push({
        labelUz: `Swing — ushlab turish ${signal.holdTimeUz}`,
        valueUz: signal.holdTimeUz,
        stance: action === "HOLD" ? "neutral" : "pro",
      });
    }
  }

  // Confluence — rejimga xos eng kuchli indikatorlar (scalp: tez / swing: trend)
  if (signal.indicatorsUz?.length) {
    for (const ind of signal.indicatorsUz.slice(0, 6)) {
      reasons.push({
        labelUz: ind,
        valueUz: "confluence",
        stance: action === "HOLD" ? "neutral" : "pro",
      });
    }
  }

  // 1. Texnik trend
  if (technical) {
    const t = technical.trend;
    reasons.push({
      labelUz: `Texnik trend ${trendUz(t)}`,
      valueUz: t === "bullish" ? "LONG" : t === "bearish" ? "SHORT" : "NEYTRAL",
      stance: biasStance(t, action),
    });

    // 2. RSI
    const rsi = Math.round(technical.rsi);
    let rsiStance: ReasonStance = "neutral";
    let rsiNote = "neytral zona";
    if (rsi >= 70) {
      rsiNote = "haddan oshgan (overbought)";
      rsiStance = action === "SELL" ? "pro" : action === "BUY" ? "con" : "neutral";
    } else if (rsi <= 30) {
      rsiNote = "haddan tushgan (oversold)";
      rsiStance = action === "BUY" ? "pro" : action === "SELL" ? "con" : "neutral";
    } else if (rsi > 55) {
      rsiNote = "kuchli tomon yuqorida";
      rsiStance = action === "BUY" ? "pro" : action === "SELL" ? "con" : "neutral";
    } else if (rsi < 45) {
      rsiNote = "kuchli tomon pastda";
      rsiStance = action === "SELL" ? "pro" : action === "BUY" ? "con" : "neutral";
    }
    reasons.push({
      labelUz: `RSI ${rsi} — ${rsiNote}`,
      valueUz: String(rsi),
      stance: rsiStance,
    });

    // 3. ADX — trend kuchi
    const adx = Math.round(technical.adx);
    const adxStrong = adx >= 25;
    reasons.push({
      labelUz: `ADX ${adx} — trend ${adxStrong ? "kuchli" : "kuchsiz"}`,
      valueUz: String(adx),
      stance: action === "HOLD" ? (adxStrong ? "con" : "pro") : adxStrong ? "pro" : "con",
    });

    // 4. SMA joylashuvi
    if (gold?.price && technical.sma20 && technical.sma50) {
      const aboveFast = gold.price >= technical.sma20;
      const fastAboveSlow = technical.sma20 >= technical.sma50;
      const smaBias = aboveFast && fastAboveSlow ? "bullish" : !aboveFast && !fastAboveSlow ? "bearish" : "neutral";
      reasons.push({
        labelUz: `Narx SMA20 ${aboveFast ? "ustida" : "ostida"}, SMA20 ${fastAboveSlow ? ">" : "<"} SMA50`,
        valueUz: smaBias === "bullish" ? "LONG" : smaBias === "bearish" ? "SHORT" : "ARALASH",
        stance: biasStance(smaBias as "bullish" | "bearish" | "neutral", action),
      });
    }
  }

  // 5. Yangiliklar biasi (swing uchun muhimroq)
  if (news) {
    const strong = news.biasStrength >= (mode === "swing" ? 55 : 65);
    reasons.push({
      labelUz: `Yangilik: ${biasUz(news.overallBias)} ${news.biasStrength}%`,
      valueUz: `${news.biasStrength}%`,
      stance:
        strong && biasStance(news.overallBias, action) === "pro"
          ? "pro"
          : strong && biasStance(news.overallBias, action) === "con"
            ? "con"
            : biasStance(news.overallBias, action),
    });

    // 6. Bull/Bear yangiliklar nisbati
    if (news.bullCount + news.bearCount > 0) {
      const bullDom = news.bullCount > news.bearCount;
      const bearDom = news.bearCount > news.bullCount;
      const ratioBias = bullDom ? "bullish" : bearDom ? "bearish" : "neutral";
      reasons.push({
        labelUz: `Ijobiy ${news.bullCount} / salbiy ${news.bearCount} xabar`,
        valueUz: `${news.bullCount}:${news.bearCount}`,
        stance: biasStance(ratioBias as "bullish" | "bearish" | "neutral", action),
      });
    }
  }

  // 7. Setup sifati
  if (setup) {
    reasons.push({
      labelUz: `Setup sifati ${setup.grade} — ${setup.score}/100`,
      valueUz: setup.grade,
      stance: setup.score >= 65 ? "pro" : setup.score >= 50 ? "neutral" : "con",
    });
  }

  // 8. Risk/Reward
  if (action !== "HOLD" && signal.riskReward) {
    const rr = signal.riskReward;
    reasons.push({
      labelUz: `Risk/Reward 1:${rr.toFixed(1)}`,
      valueUz: `1:${rr.toFixed(1)}`,
      stance: rr >= 1.8 ? "pro" : rr >= 1.2 ? "neutral" : "con",
    });
  }

  // 9. Yutish ehtimoli / ishonch
  const prob = signal.winProbability ?? signal.confidence ?? 0;
  reasons.push({
    labelUz: `Yutish ehtimoli ${prob}%`,
    valueUz: `${prob}%`,
    stance: prob >= 65 ? "pro" : prob >= 50 ? "neutral" : "con",
  });

  // 10. Moslik (confluence) — scalp uchun panel
  if (signal.confluencePct != null && mode === "scalp") {
    reasons.push({
      labelUz: `M1 kuch ${signal.confluencePct}%`,
      valueUz: `${signal.confluencePct}%`,
      stance: signal.confluencePct >= 50 ? "pro" : signal.confluencePct >= 35 ? "neutral" : "con",
    });
  }

  const proCount = reasons.filter((r) => r.stance === "pro").length;
  const conCount = reasons.filter((r) => r.stance === "con").length;

  let headlineUz: string;
  const modeLabel = mode === "scalp" ? "TEZ SAVDO" : "UZOQ MUDDAT";
  if (action === "HOLD") {
    headlineUz =
      conCount >= proCount
        ? `${modeLabel}: faktlar qarama-qarshi — aniq setup yo'q, KUTISH.`
        : `${modeLabel}: signallar to'liq mos emas — tasdiq kutilmoqda, KUTISH.`;
  } else {
    const dir = action === "BUY" ? "ko'tarilish (LONG)" : "tushish (SHORT)";
    headlineUz = `${modeLabel}: ${proCount} ta fakt ${dir} tomonda${
      conCount ? `, ${conCount} ta qarshi` : ""
    } — shuning uchun ${action}.`;
  }

  return { action, headlineUz, proCount, conCount, reasons };
}
