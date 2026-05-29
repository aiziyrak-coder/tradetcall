/**
 * Umumiy setup sifati — zarar kamaytirish, faqat yuqori ishonchli signal
 */

import type { NewsMarketAnalysis } from "./types";
import type { TechnicalAnalysis } from "./types";
import type { M1ScalpLead } from "./m1-scalp";
import type { LiveMomentum } from "./scalp-signal-guard";
import type { EnhancedIndicators } from "./enhanced-technical";
import type { CalendarStatus } from "./calendar-types";

export interface SetupQuality {
  score: number;
  grade: "A" | "B" | "C" | "D";
  gradeUz: string;
  tradeAllowed: boolean;
  longScore: number;
  shortScore: number;
  reasonsUz: string[];
  warningsUz: string[];
  summaryUz: string;
}

const MIN_TRADE_SCORE = 48;
const MIN_TRADE_SCORE_STRICT = 58;

function gradeFromScore(s: number): SetupQuality["grade"] {
  if (s >= 78) return "A";
  if (s >= 65) return "B";
  if (s >= 50) return "C";
  return "D";
}

function gradeUz(g: SetupQuality["grade"]): string {
  if (g === "A") return "A — professional setup";
  if (g === "B") return "B — yaxshi";
  if (g === "C") return "C — ehtiyot";
  return "D — savdo tavsiya etilmaydi";
}

export function computeSetupQuality(input: {
  tech1: TechnicalAnalysis & { enhanced?: EnhancedIndicators };
  tech5: TechnicalAnalysis & { enhanced?: EnhancedIndicators };
  news: NewsMarketAnalysis | null;
  m1Scalp: M1ScalpLead | null;
  live: LiveMomentum | null;
  calendar?: CalendarStatus | null;
  marketQualityScore?: number;
  disciplineScore?: number;
  capitalShieldOk?: boolean;
}): SetupQuality {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let longScore = 0;
  let shortScore = 0;
  let base = 42;

  const e1 = input.tech1.enhanced;
  const e5 = input.tech5.enhanced;

  if (input.tech1.adx >= 22) {
    base += 8;
    reasons.push(`M1 ADX ${input.tech1.adx} — trend bor`);
  } else if (input.tech1.adx < 16) {
    base -= 4;
    warnings.push("M1 ADX past — range, kichik lot");
  }

  if (e1) {
    if (e1.trendStrength >= 55) {
      base += 10;
      reasons.push(`Trend kuchi ${e1.trendStrength}%`);
    }
    if (e1.macdBias === "bullish") longScore += 18;
    if (e1.macdBias === "bearish") shortScore += 18;
    if (input.tech1.trend === "bullish") longScore += 14;
    if (input.tech1.trend === "bearish") shortScore += 14;
    if (e5?.trendStrength && e5.trendStrength >= 50) {
      if (input.tech5.trend === "bullish") longScore += 10;
      if (input.tech5.trend === "bearish") shortScore += 10;
    }
    if (e1.volumeBias === "bullish") longScore += 8;
    if (e1.volumeBias === "bearish") shortScore += 8;
  }

  const na = input.news;
  if (na) {
    if (na.contradictionsUz) {
      base -= 25;
      warnings.push("Yangiliklar zid");
    } else if (na.newsCandleAligned) {
      base += 14;
      reasons.push("Yangilik + sham MOS");
    }
    if (na.overallBias === "bullish") longScore += na.biasStrength * 0.25;
    if (na.overallBias === "bearish") shortScore += na.biasStrength * 0.25;
    if (na.confidence >= 55) base += 6;
    if (na.confidence < 40) {
      base -= 10;
      warnings.push(`Yangilik ishonchi past ${na.confidence}%`);
    }
  } else {
    base -= 8;
    warnings.push("Yangiliklar tahlili yo'q");
  }

  const m1 = input.m1Scalp;
  if (m1) {
    if (m1.direction === "long" && m1.phase !== "exhausted") longScore += m1.strength * 0.35;
    if (m1.direction === "short" && m1.phase !== "exhausted") shortScore += m1.strength * 0.35;
    if (m1.phase === "reversal" || m1.phase === "range") {
      base -= 12;
      warnings.push(`M1 ${m1.phase} — aniq yo'nalish yo'q`);
    }
  }

  const live = input.live;
  if (live?.direction === "up") {
    longScore += 16;
    if (input.tech1.adx < 18) base += 6;
  }
  if (live?.direction === "down") {
    shortScore += 16;
    if (input.tech1.adx < 18) base += 6;
  }

  if (input.calendar?.inHighImpactWindow) {
    base -= 30;
    warnings.push("Makro voqea oynasi — lot ochmang");
  }

  if (input.marketQualityScore != null && input.marketQualityScore < 55) {
    base -= 15;
    warnings.push(`Bozor sifati ${input.marketQualityScore}/100`);
  } else if (input.marketQualityScore != null && input.marketQualityScore >= 70) {
    base += 6;
  }

  if (input.disciplineScore != null && input.disciplineScore < 60) {
    base -= 12;
    warnings.push(`Qoidalar ${input.disciplineScore}% — ehtiyot`);
  }

  if (input.capitalShieldOk === false) {
    base -= 40;
    warnings.push("Kapital himoyasi — bugun limit");
  }

  const dominant = Math.max(longScore, shortScore);
  const clarity = Math.abs(longScore - shortScore);
  let score = Math.min(100, Math.max(0, Math.round(base + dominant * 0.12 + clarity * 0.08)));

  const grade = gradeFromScore(score);
  const tradeAllowed =
    score >= MIN_TRADE_SCORE &&
    warnings.filter((w) => /makro|kapital|zid/i.test(w)).length === 0 &&
    input.capitalShieldOk !== false &&
    clarity >= 8;

  const summaryUz = tradeAllowed
    ? `Setup ${score}/100 (${gradeUz(grade)}) — savdo mumkin, SL majburiy.`
    : `Setup ${score}/100 (${gradeUz(grade)}) — HOZIR KIRMANG. ${warnings[0] ?? "Shartlar yetarli emas"}`;

  return {
    score,
    grade,
    gradeUz: gradeUz(grade),
    tradeAllowed,
    longScore: Math.round(longScore),
    shortScore: Math.round(shortScore),
    reasonsUz: reasons.slice(0, 5),
    warningsUz: warnings.slice(0, 5),
    summaryUz,
  };
}

export function formatSetupQualityForAi(q: SetupQuality): string {
  return `SETUP SIFATI: ${q.score}/100 — ${q.gradeUz}
${q.tradeAllowed ? "SAVDO RUXSAT" : "SAVDO TAQLANGAN — faqat HOLD"}
Long ball: ${q.longScore} | Short ball: ${q.shortScore}
Sabablari: ${q.reasonsUz.join("; ") || "—"}
Ogohlantirish: ${q.warningsUz.join("; ") || "yo'q"}
QOIDA: Score >= ${MIN_TRADE_SCORE} va long/short aniq bo'lsa BUY/SELL bering (confidence mos). Faqat makro zid yoki kapital limit → HOLD.`;
}

export function minScoreForTrade(strict = false): number {
  return strict ? MIN_TRADE_SCORE_STRICT : MIN_TRADE_SCORE;
}
