import type { MarketQuality } from "./market-quality";
import type { CalendarStatus } from "./calendar-types";

export interface CapitalShieldPrefs {
  enabled: boolean;
  maxDailyLossPct: number;
  maxTradesPerDay: number;
  pauseAfterLosses: number;
  minMarketQuality: number;
}

export const DEFAULT_CAPITAL_SHIELD: CapitalShieldPrefs = {
  enabled: true,
  maxDailyLossPct: 3,
  maxTradesPerDay: 6,
  pauseAfterLosses: 3,
  minMarketQuality: 55,
};

export interface CapitalShieldDayStats {
  dateKey: string;
  trades: number;
  wins: number;
  losses: number;
  estimatedLossPct: number;
  consecutiveLosses: number;
}

export interface CapitalShieldState {
  allowed: boolean;
  level: "green" | "yellow" | "red";
  levelUz: string;
  messagesUz: string[];
  stats: CapitalShieldDayStats;
}

export function evaluateCapitalShield(input: {
  prefs: CapitalShieldPrefs;
  stats: CapitalShieldDayStats;
  marketQuality: MarketQuality;
  calendar: CalendarStatus | null | undefined;
  hasOpenSignal: boolean;
}): CapitalShieldState {
  const { prefs, stats, marketQuality, calendar } = input;
  const messages: string[] = [];

  if (!prefs.enabled) {
    return {
      allowed: true,
      level: "green",
      levelUz: "Himoya o'chirilgan",
      messagesUz: ["Kapital himoyasi o'chiq — o'zingiz nazorat qiling"],
      stats,
    };
  }

  let allowed = true;
  let level: CapitalShieldState["level"] = "green";

  if (stats.estimatedLossPct >= prefs.maxDailyLossPct) {
    allowed = false;
    level = "red";
    messages.push(
      `Kunlik zarar limiti: ${stats.estimatedLossPct.toFixed(1)}% / ${prefs.maxDailyLossPct}%`
    );
  }

  if (stats.trades >= prefs.maxTradesPerDay) {
    allowed = false;
    level = "red";
    messages.push(`Kunlik savdo limiti: ${stats.trades}/${prefs.maxTradesPerDay}`);
  }

  if (stats.consecutiveLosses >= prefs.pauseAfterLosses) {
    allowed = false;
    level = "red";
    messages.push(
      `${stats.consecutiveLosses} ketma-ket zarar — bugun tanaffus tavsiya etiladi`
    );
  }

  if (marketQuality.score < prefs.minMarketQuality) {
    allowed = false;
    level = level === "red" ? "red" : "yellow";
    messages.push(`Bozor sifati past: ${marketQuality.score} (min ${prefs.minMarketQuality})`);
  }

  if (calendar?.inHighImpactWindow) {
    allowed = false;
    level = "red";
    messages.push(calendar.hintUz ?? "Makro oyna — savdo taqiq");
  }

  if (allowed && level === "green" && stats.trades > 0) {
    messages.push(
      `Bugun: ${stats.trades} signal, ${stats.wins} foyda / ${stats.losses} zarar (taxminiy)`
    );
  }

  if (allowed && messages.length === 0) {
    messages.push("Kapital himoyasi: shartlar normal");
  }

  const levelUz =
    level === "green"
      ? "Yashil — savdo ruxsat"
      : level === "yellow"
        ? "Sariq — ehtiyot"
        : "Qizil — savdo to'xtatilgan";

  return { allowed, level, levelUz, messagesUz: messages, stats };
}
