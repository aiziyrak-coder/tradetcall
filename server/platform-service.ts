import { DEFAULT_CAPITAL_SHIELD } from "../shared/capital-shield";
import { buildPlatformInsight, type PlatformInsight } from "../shared/platform-insight";
import { peekYahooReferencePrice } from "../shared/price";
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

export function enrichSnapshotWithPlatform(snap: MonitorSnapshot): MonitorSnapshot {
  const price = snap.gold?.price;
  if (price != null && price > 0) {
    resolvePendingSignals(price);

    const shortV = snap.shortStrategy?.verdict;
    if (shortV && (shortV.action === "BUY" || shortV.action === "SELL") && snap.shortStrategy) {
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

    const longV = snap.strategy?.verdict;
    if (longV && (longV.action === "BUY" || longV.action === "SELL") && snap.strategy) {
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

  const journalStats = getJournalStats();
  const shieldDay = getTodayShieldStats(1000);
  const journalEntries = getJournalSnapshot().entries;

  const platformBase = buildPlatformInsight(
    snap,
    journalStats,
    DEFAULT_CAPITAL_SHIELD,
    shieldDay,
    peekYahooReferencePrice()
  );
  const platform: PlatformInsight = {
    ...platformBase,
    weeklyReport: buildWeeklyReport(journalEntries),
  };
  lastPlatform = platform;

  return { ...snap, platform };
}

export function getLastPlatformInsight(): PlatformInsight | null {
  return lastPlatform;
}
