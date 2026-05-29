import type { MarketQuality } from "./market-quality";
import type { CalendarStatus } from "./calendar-types";

export interface CapitalShieldPrefs {
  enabled: boolean;
  maxDailyLossPct: number;
  maxDailyProfitPct: number;
  maxTradesPerDay: number;
  pauseAfterLosses: number;
  pauseCooldownMinutes: number;
  minMarketQuality: number;
}

export const DEFAULT_CAPITAL_SHIELD: CapitalShieldPrefs = {
  enabled: true,
  maxDailyLossPct: 2.5,
  maxDailyProfitPct: 3.0,
  maxTradesPerDay: 4,
  pauseAfterLosses: 2,
  pauseCooldownMinutes: 90,
  minMarketQuality: 58,
};

export interface CapitalShieldDayStats {
  dateKey: string;
  trades: number;
  wins: number;
  losses: number;
  estimatedLossPct: number;
  estimatedProfitPct: number;
  consecutiveLosses: number;
  pauseUntil: string | null;
}

export interface CapitalShieldState {
  allowed: boolean;
  /** Yangi lot/signal yozish (journal) */
  allowNewTrades: boolean;
  /** YANGI PROGNOZ (AI) — greed stop bloklamaydi */
  allowAiForecast: boolean;
  level: "green" | "yellow" | "red";
  levelUz: string;
  messagesUz: string[];
  stats: CapitalShieldDayStats;
}

function pauseRemainingMinutes(pauseUntil: string | null): number {
  if (!pauseUntil) return 0;
  const ms = new Date(pauseUntil).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
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
      allowNewTrades: true,
      allowAiForecast: true,
      level: "green",
      levelUz: "Himoya o'chirilgan",
      messagesUz: ["Kapital himoyasi o'chiq — o'zingiz nazorat qiling"],
      stats,
    };
  }

  let allowed = true;
  let allowNewTrades = true;
  let allowAiForecast = true;
  let level: CapitalShieldState["level"] = "green";

  const pauseMin = pauseRemainingMinutes(stats.pauseUntil);
  if (pauseMin > 0) {
    allowNewTrades = false;
    level = level === "red" ? "red" : "yellow";
    messages.push(`Tanaffus — ${pauseMin} daqiqa (ketma-ket zarar) — prognoz mumkin`);
  }

  if (stats.estimatedProfitPct >= prefs.maxDailyProfitPct) {
    allowNewTrades = false;
    level = level === "red" ? "red" : "yellow";
    messages.push(
      `Kunlik foyda maqsadi yetdi: ${stats.estimatedProfitPct.toFixed(1)}% / ${prefs.maxDailyProfitPct}% — yangi lot ochmang`
    );
  }

  if (stats.estimatedLossPct >= prefs.maxDailyLossPct) {
    allowNewTrades = false;
    level = level === "red" ? "red" : "yellow";
    messages.push(
      `Kunlik zarar limiti: ${stats.estimatedLossPct.toFixed(1)}% / ${prefs.maxDailyLossPct}% — yangi lot ochmang`
    );
  }

  if (stats.trades >= prefs.maxTradesPerDay) {
    allowNewTrades = false;
    level = level === "red" ? "red" : "yellow";
    messages.push(`Kunlik signal limiti: ${stats.trades}/${prefs.maxTradesPerDay}`);
  }

  if (stats.consecutiveLosses >= prefs.pauseAfterLosses && pauseMin <= 0) {
    allowNewTrades = false;
    level = level === "red" ? "red" : "yellow";
    messages.push(
      `${stats.consecutiveLosses} ketma-ket zarar — ehtiyot, prognoz mumkin`
    );
  }

  if (marketQuality.score < prefs.minMarketQuality) {
    allowNewTrades = false;
    level = level === "red" ? "red" : "yellow";
    messages.push(`Bozor sifati past: ${marketQuality.score} — prognoz mumkin`);
  }

  if (calendar?.inHighImpactWindow) {
    allowNewTrades = false;
    level = "red";
    messages.push(calendar.hintUz ?? "Makro oyna — ehtiyot");
  }

  allowAiForecast = true;
  allowed = allowNewTrades;

  if (allowed && stats.trades > 0) {
    messages.push(
      `Bugun: ${stats.trades} signal, +${stats.estimatedProfitPct.toFixed(1)}% / -${stats.estimatedLossPct.toFixed(1)}%`
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

  return {
    allowed,
    allowNewTrades,
    allowAiForecast,
    level,
    levelUz,
    messagesUz: messages,
    stats,
  };
}
