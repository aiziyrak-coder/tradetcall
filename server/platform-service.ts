import { DEFAULT_CAPITAL_SHIELD } from "../shared/capital-shield";
import { buildPlatformInsight, type PlatformInsight } from "../shared/platform-insight";
import { applyProfitProtectionToSnapshot } from "../shared/profit-protection";
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

  const blockCtx = {
    capitalShield: platform.capitalShield,
    discipline: platform.discipline,
    marketQuality: platform.marketQuality,
  };
  let guarded = applyProfitProtectionToSnapshot(snap, blockCtx);

  const tradingBlocked =
    !platform.capitalShield.allowed ||
    !platform.marketQuality.tradeable ||
    platform.discipline.score < 60;

  if (price != null && price > 0 && !tradingBlocked) {
    const ai = guarded.aiSignal;
    if (ai && (ai.action === "BUY" || ai.action === "SELL") && ai.confidence >= 55) {
      recordSignalIfNew({
        horizon: "short",
        action: ai.action,
        strength: ai.confidence,
        entry: ai.entry,
        stopLoss: ai.stopLoss,
        takeProfit: ai.takeProfit,
        price,
      });
    }
  }

  lastPlatform = platform;

  return { ...guarded, platform };
}

export function getLastPlatformInsight(): PlatformInsight | null {
  return lastPlatform;
}
