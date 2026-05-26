import { runQuickBacktest } from "./backtest-quick";
import {
  DEFAULT_CAPITAL_SHIELD,
  evaluateCapitalShield,
  type CapitalShieldDayStats,
  type CapitalShieldPrefs,
  type CapitalShieldState,
} from "./capital-shield";
import { computeMarketQuality, type MarketQuality } from "./market-quality";
import { auditPlatformSnapshot, type PlatformAuditReport } from "./platform-audit";
import { buildSignalExplainer, type SignalExplainer } from "./signal-explainer";
import type { MonitorSnapshot } from "./types";
export interface JournalStats {
  total: number;
  wins: number;
  losses: number;
  pending: number;
  winRatePct: number;
  last7WinRatePct: number;
}

export interface PlatformInsight {
  marketQuality: MarketQuality;
  capitalShield: CapitalShieldState;
  shortExplainer: SignalExplainer | null;
  longExplainer: SignalExplainer | null;
  audit: PlatformAuditReport;
  journalStats: JournalStats;
  backtestShort: ReturnType<typeof runQuickBacktest>;
  backtestLong: ReturnType<typeof runQuickBacktest>;
  playbookUz: string;
  updatedAt: string;
}

export function buildPlatformInsight(
  snap: MonitorSnapshot,
  journalStats: JournalStats,
  shieldPrefs: CapitalShieldPrefs = DEFAULT_CAPITAL_SHIELD,
  shieldDayStats?: CapitalShieldDayStats
): PlatformInsight {
  const marketQuality = computeMarketQuality(snap.gold, snap);
  const audit = auditPlatformSnapshot(snap);

  const today = new Date().toISOString().slice(0, 10);
  const stats: CapitalShieldDayStats = shieldDayStats ?? {
    dateKey: today,
    trades: journalStats.total,
    wins: journalStats.wins,
    losses: journalStats.losses,
    estimatedLossPct: journalStats.losses * 0.5,
    consecutiveLosses: 0,
  };

  const capitalShield = evaluateCapitalShield({
    prefs: shieldPrefs,
    stats,
    marketQuality,
    calendar: snap.calendar,
    hasOpenSignal:
      snap.shortStrategy?.verdict?.action === "BUY" ||
      snap.shortStrategy?.verdict?.action === "SELL" ||
      snap.strategy?.verdict?.action === "BUY" ||
      snap.strategy?.verdict?.action === "SELL",
  });

  const gateShort = snap.shortStrategy?.signal?.gate;
  const gateLong = snap.strategy?.signal?.gate;

  const shortExplainer = snap.shortStrategy
    ? buildSignalExplainer({
        horizon: "short",
        verdict: snap.shortStrategy.verdict,
        gate: gateShort ?? null,
        rawBias: snap.shortStrategy.bias,
        marketQuality,
        tfAligned: snap.shortStrategy.tfAligned,
        tfTotal: snap.shortStrategy.tfTotal,
        stabilityNoteUz:
          snap.shortStrategy.verdict.action === "HOLD" &&
          snap.shortStrategy.bias !== "wait"
            ? snap.shortStrategy.verdict.reliabilityUz
            : undefined,
      })
    : null;

  const longExplainer = snap.strategy
    ? buildSignalExplainer({
        horizon: "long",
        verdict: snap.strategy.verdict,
        gate: gateLong ?? null,
        rawBias: snap.strategy.bias,
        marketQuality,
        stabilityNoteUz:
          snap.strategy.verdict.action === "HOLD" && snap.strategy.bias !== "wait"
            ? snap.strategy.verdict.reliabilityUz
            : undefined,
      })
    : null;

  const candles5 = snap.chart?.interval === "5m" ? snap.chart.candles : [];
  const backtestShort = runQuickBacktest(candles5, "short");
  const backtestLong = runQuickBacktest(candles5, "long");

  const shortAct = snap.shortStrategy?.verdict?.action ?? "HOLD";
  const longAct = snap.strategy?.verdict?.action ?? "HOLD";

  let playbookUz = `Bozor ${marketQuality.grade} (${marketQuality.score}). `;
  if (!capitalShield.allowed) {
    playbookUz += `Kapital himoyasi: ${capitalShield.messagesUz[0]}. `;
  } else if (shortAct === "BUY" || shortAct === "SELL") {
    playbookUz += `YAQIN ${shortAct} — 30 daqiqa qoidasi, kichik lot. `;
  } else if (longAct === "BUY" || longAct === "SELL") {
    playbookUz += `UZOQ ${longAct} — swing, kunlik SL nazorat. `;
  } else {
    playbookUz += shortExplainer?.unlockUz[0]
      ? `Kutilmoqda: ${shortExplainer.unlockUz[0]}. `
      : "Setup yo'q — majburiy savdo qilmang. ";
  }
  playbookUz += backtestShort.samples >= 8
    ? `Scalp backtest: ${backtestShort.winRatePct}%.`
    : "";

  return {
    marketQuality,
    capitalShield,
    shortExplainer,
    longExplainer,
    audit,
    journalStats,
    backtestShort,
    backtestLong,
    playbookUz: playbookUz.trim(),
    updatedAt: new Date().toISOString(),
  };
}
