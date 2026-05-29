import type { CalendarStatus } from "./calendar-types";
import { getMarketSession } from "./market-session";
import type { MonitorSnapshot, PriceData } from "./types";

export interface MarketQuality {
  score: number;
  grade: "A" | "B" | "C" | "D";
  gradeUz: string;
  spreadPts: number | null;
  feedUz: string;
  sessionUz: string;
  calendarUz: string;
  warningsUz: string[];
  tradeable: boolean;
  summaryUz: string;
}

function gradeFromScore(score: number): MarketQuality["grade"] {
  if (score >= 82) return "A";
  if (score >= 68) return "B";
  if (score >= 50) return "C";
  return "D";
}

function gradeLabel(g: MarketQuality["grade"]): string {
  if (g === "A") return "A — ideal sharoit";
  if (g === "B") return "B — yaxshi";
  if (g === "C") return "C — ehtiyotkor";
  return "D — savdo tavsiya etilmaydi";
}

export function computeMarketQuality(
  gold: PriceData | null,
  snapshot: Pick<MonitorSnapshot, "priceStale" | "feedError" | "calendar">
): MarketQuality {
  const warnings: string[] = [];
  let score = 100;

  const session = getMarketSession();
  const cal = snapshot.calendar;

  if (snapshot.priceStale) {
    score -= 35;
    warnings.push("Narx eskirgan — signal ishonchsiz");
  }
  if (snapshot.feedError) {
    score -= 20;
    warnings.push(snapshot.feedError.slice(0, 80));
  }

  let feedUz = "Noma'lum manba";
  if (gold?.feed === "tradingview") {
    feedUz = gold.source?.slice(0, 42) ?? "TradingView XAUUSD";
    score += 6;
  } else if (gold?.feed === "spot") {
    feedUz = "Spot API — jonli XAU";
  } else if (gold?.feed === "yahoo") {
    feedUz = "Yahoo — spot zaxira";
    score -= 6;
  } else if (gold?.source) {
    feedUz = gold.source.slice(0, 40);
  }

  let spreadPts: number | null = null;
  if (gold?.spread != null && gold.spread > 0) {
    spreadPts = Math.round(gold.spread * 100) / 100;
    if (spreadPts > 0.45) {
      score -= 18;
      warnings.push(`Spread keng: $${spreadPts}`);
    }
  }

  let sessionUz = session.nameUz;
  if (!session.active && session.volatility === "past") {
    score -= 25;
    sessionUz += " — bozor past";
    warnings.push("London/NY ochilishini kuting");
  } else if (session.primeWindow) {
    score += 8;
    sessionUz += " — prime oyna";
  }

  let calendarUz = "Makro xavfsiz";
  if (cal?.inHighImpactWindow) {
    score -= 30;
    calendarUz = cal.hintUz ?? "Yuqori ta'sir oynasi";
    warnings.push("Makro voqea — yangi lot ochmang");
  } else if (cal?.upcoming?.length) {
    const next = cal.upcoming.find((e) => e.impact === "high") ?? cal.upcoming[0];
    score -= 8;
    calendarUz = `Yaqin: ${next?.nameUz ?? next?.name ?? "voqea"}`;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = gradeFromScore(score);
  const tradeable = score >= 55 && !snapshot.priceStale && !cal?.inHighImpactWindow;

  const summaryUz = tradeable
    ? `Bozor sifati ${score}/100 — ${gradeLabel(grade)}. Savdo mumkin, SL majburiy.`
    : `Bozor sifati ${score}/100 — ${gradeLabel(grade)}. Avval shartlarni tuzating.`;

  return {
    score,
    grade,
    gradeUz: gradeLabel(grade),
    spreadPts,
    feedUz,
    sessionUz,
    calendarUz,
    warningsUz: warnings.slice(0, 5),
    tradeable,
    summaryUz,
  };
}
