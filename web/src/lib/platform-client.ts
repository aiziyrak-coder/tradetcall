import {
  DEFAULT_CAPITAL_SHIELD,
  evaluateCapitalShield,
} from "../../../shared/capital-shield";
import type { PlatformInsight } from "../../../shared/platform-insight";
import { evaluateTradingDiscipline } from "../../../shared/trading-discipline";
import type { MonitorSnapshot } from "../../../shared/types";
import { loadTradePrefs } from "./trade-prefs";

/** Server platform + mijoz kapital himoya sozlamalari */
export function resolvePlatformInsight(snap: MonitorSnapshot | null): PlatformInsight | null {
  if (!snap?.platform) return null;
  const prefs = loadTradePrefs();
  const shieldPrefs = { ...DEFAULT_CAPITAL_SHIELD, ...prefs.capitalShield };
  const day = snap.platform.capitalShield.stats;
  const capitalShield = evaluateCapitalShield({
    prefs: shieldPrefs,
    stats: day,
    marketQuality: snap.platform.marketQuality,
    calendar: snap.calendar,
    hasOpenSignal:
      snap.shortStrategy?.verdict?.action === "BUY" ||
      snap.shortStrategy?.verdict?.action === "SELL" ||
      snap.strategy?.verdict?.action === "BUY" ||
      snap.strategy?.verdict?.action === "SELL",
  });
  const discipline = evaluateTradingDiscipline({
    marketQuality: snap.platform.marketQuality,
    capitalShield,
    newsFreshness: snap.platform.newsFreshness,
    signalsToday: day.trades,
    maxSignalsPerDay: shieldPrefs.maxTradesPerDay,
  });
  return { ...snap.platform, capitalShield, discipline };
}
