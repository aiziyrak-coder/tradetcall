import { runQuickBacktest } from "./backtest-quick";
import {
  DEFAULT_CAPITAL_SHIELD,
  evaluateCapitalShield,
  type CapitalShieldDayStats,
  type CapitalShieldPrefs,
  type CapitalShieldState,
} from "./capital-shield";
import { analyzeMacroCorrelation, type MacroCorrelation } from "./macro-correlation";
import { computeMarketQuality, type MarketQuality } from "./market-quality";
import { analyzeNewsFreshness, type NewsFreshness } from "./news-freshness";
import { auditPlatformSnapshot, type PlatformAuditReport } from "./platform-audit";
import { buildSignalExplainer, type SignalExplainer } from "./signal-explainer";
import { evaluateTradingDiscipline, type TradingDiscipline } from "./trading-discipline";
import type { MonitorSnapshot } from "./types";
import { buildWeeklyReport, type WeeklyReport } from "./weekly-report";

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
  macroCorrelation: MacroCorrelation;
  newsFreshness: NewsFreshness;
  discipline: TradingDiscipline;
  weeklyReport: WeeklyReport;
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
  const macroCorrelation = analyzeMacroCorrelation(snap.drivers ?? [], snap.newsAnalysis);
  const newsFreshness = analyzeNewsFreshness(snap.news);

  const today = new Date().toISOString().slice(0, 10);
  const stats: CapitalShieldDayStats = shieldDayStats ?? {
    dateKey: today,
    trades: journalStats.total,
    wins: journalStats.wins,
    losses: journalStats.losses,
    estimatedLossPct: journalStats.losses * 0.5,
    estimatedProfitPct: 0,
    consecutiveLosses: 0,
    pauseUntil: null,
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

  const discipline = evaluateTradingDiscipline({
    marketQuality,
    capitalShield,
    newsFreshness,
    signalsToday: stats.trades,
    maxSignalsPerDay: shieldPrefs.maxTradesPerDay,
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

  const backtestShort = runQuickBacktest([], "short");
  const backtestLong = runQuickBacktest([], "long");
  const weeklyReport = buildWeeklyReport([]);

  const shortAct = snap.shortStrategy?.verdict?.action ?? "HOLD";
  const longAct = snap.strategy?.verdict?.action ?? "HOLD";

  let playbookUz = `Bozor ${marketQuality.grade} (${marketQuality.score}). `;
  if (macroCorrelation.warningUz) playbookUz += `${macroCorrelation.warningUz}. `;
  if (newsFreshness.stale) playbookUz += `${newsFreshness.freshnessUz}. `;
  if (!capitalShield.allowed) {
    playbookUz += `Himoya: ${capitalShield.messagesUz[0]}. `;
  } else if (discipline.score < 60) {
    playbookUz += discipline.summaryUz + " ";
  } else if (shortAct === "BUY" || shortAct === "SELL") {
    playbookUz += `YAQIN ${shortAct} — SL/TP aniq, max 30 daqiqa. `;
  } else if (longAct === "BUY" || longAct === "SELL") {
    playbookUz += `UZOQ ${longAct} — swing. `;
  } else {
    playbookUz += shortExplainer?.unlockUz[0]
      ? `Kutilmoqda: ${shortExplainer.unlockUz[0]}. `
      : "Setup yo'q. ";
  }

  return {
    marketQuality,
    capitalShield,
    shortExplainer,
    longExplainer,
    audit,
    journalStats,
    backtestShort,
    backtestLong,
    macroCorrelation,
    newsFreshness,
    discipline,
    weeklyReport,
    playbookUz: playbookUz.trim(),
    updatedAt: new Date().toISOString(),
  };
}
