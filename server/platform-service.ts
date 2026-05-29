import { DEFAULT_CAPITAL_SHIELD } from "../shared/capital-shield";
import { buildPlatformInsight, type PlatformInsight } from "../shared/platform-insight";
import { applyProfitProtectionToSnapshot } from "../shared/profit-protection";
import { buildTradePlan } from "../shared/trade-plan";
import type { MonitorSnapshot } from "../shared/types";
import { buildWeeklyReport } from "../shared/weekly-report";
import {
  getJournalSnapshot,
  getJournalStats,
  getTodayShieldStats,
  recordSignalIfNew,
  resolvePendingSignals,
} from "./signal-journal-store";

let lastPlatform: PlatformInsight | null = null;

export function enrichSnapshotWithPlatform(
  snap: MonitorSnapshot,
  accountUsd = 1000
): MonitorSnapshot {
  const price = snap.gold?.price;
  if (price != null && price > 0) {
    resolvePendingSignals(price);
  }

  const journalStats = getJournalStats();
  const shieldDay = getTodayShieldStats(accountUsd);
  const journalEntries = getJournalSnapshot().entries;

  const platformBase = buildPlatformInsight(
    snap,
    journalStats,
    DEFAULT_CAPITAL_SHIELD,
    shieldDay
  );
  const platform: PlatformInsight = {
    ...platformBase,
    weeklyReport: buildWeeklyReport(journalEntries),
  };

  let guarded = applyProfitProtectionToSnapshot(snap, {
    capitalShield: platform.capitalShield,
    discipline: platform.discipline,
    marketQuality: platform.marketQuality,
  });

  if (price != null && price > 0) {
    const shortV = guarded.shortStrategy?.verdict;
    if (shortV && (shortV.action === "BUY" || shortV.action === "SELL") && guarded.shortStrategy) {
      const plan = buildTradePlan({
        horizon: "short",
        horizonLabelUz: "YAQIN",
        verdict: shortV,
        signal: guarded.shortStrategy.signal,
        accountUsd,
        riskPercent: 1,
        maxHoldMinutes: guarded.shortStrategy.maxHoldMinutes ?? 30,
        tradingAllowed: platform.capitalShield.allowed,
        disciplineScore: platform.discipline.score,
      });
      if (plan.trusted) {
        recordSignalIfNew({
          horizon: "short",
          action: shortV.action,
          strength: shortV.strength,
          entry: shortV.entry,
          stopLoss: shortV.stopLoss,
          takeProfit: shortV.takeProfit,
          price,
        });
      }
    }

    const longV = guarded.strategy?.verdict;
    if (longV && (longV.action === "BUY" || longV.action === "SELL") && guarded.strategy) {
      const plan = buildTradePlan({
        horizon: "long",
        horizonLabelUz: "UZOQ",
        verdict: longV,
        signal: guarded.strategy.signal,
        accountUsd,
        riskPercent: 1,
        tradingAllowed: platform.capitalShield.allowed,
        disciplineScore: platform.discipline.score,
      });
      if (plan.trusted) {
        recordSignalIfNew({
          horizon: "long",
          action: longV.action,
          strength: longV.strength,
          entry: longV.entry,
          stopLoss: longV.stopLoss,
          takeProfit: longV.takeProfit,
          price,
        });
      }
    }
  }

  lastPlatform = platform;

  return { ...guarded, platform };
}

export function getLastPlatformInsight(): PlatformInsight | null {
  return lastPlatform;
}
