import {
  DEFAULT_CAPITAL_SHIELD,
  evaluateCapitalShield,
} from "../../../shared/capital-shield";
import type { PlatformInsight } from "../../../shared/platform-insight";
import type { MonitorSnapshot } from "../../../shared/types";
import { loadTradePrefs } from "./trade-prefs";

/** Server platform + mijoz kapital himoya sozlamalari */
export function resolvePlatformInsight(snap: MonitorSnapshot | null): PlatformInsight | null {
  if (!snap?.platform) return null;
  const prefs = loadTradePrefs();
  const shieldPrefs = prefs.capitalShield ?? DEFAULT_CAPITAL_SHIELD;
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
  return { ...snap.platform, capitalShield };
}
