import type { AiTradeSignal } from "./ai-trade-signal";
import type { CapitalShieldState } from "./capital-shield";
import type { HorizonVerdict } from "./horizon-verdict";
import type { JournalStats } from "./platform-insight";
import type { MarketQuality } from "./market-quality";
import type { TradingDiscipline } from "./trading-discipline";
import type { MonitorSnapshot } from "./types";

/** Scalp uchun qattiq rejim — oxirgi 7 kun WR past bo'lsa */
export const STRICT_SHORT_THRESHOLDS = {
  minFilters: 4,
  filterTotal: 7,
  minStrength: 52,
  minConfluence: 48,
  minRiskReward: 1.5,
  minNewsConfidence: 36,
  minNewsStrength: 28,
  minBiasScore: 1.1,
  minTfVoteRatio: 0.35,
};

const ADAPTIVE_WR_CUTOFF = 42;

export function useStrictShortMode(journal: JournalStats | null | undefined): boolean {
  if (!journal) return false;
  const closed = journal.wins + journal.losses;
  if (closed < 8) return false;
  return journal.last7WinRatePct < ADAPTIVE_WR_CUTOFF;
}

/** YANGI PROGNOZ — xavfli shartlarda BUY/SELL bloklanadi */
export function shouldBlockAiForecast(input: {
  capitalShield: CapitalShieldState;
  discipline: TradingDiscipline;
  marketQuality: MarketQuality;
}): { block: boolean; reasonUz: string; warningUz?: string } {
  const { capitalShield, discipline, marketQuality } = input;

  if (!capitalShield.allowNewTrades || !capitalShield.allowed) {
    const reason =
      capitalShield.messagesUz[0] ?? "Kapital himoyasi — bugun savdo cheklangan";
    return { block: true, reasonUz: reason, warningUz: reason };
  }

  if (!marketQuality.tradeable) {
    const reason = `Bozor ${marketQuality.grade} (${marketQuality.score}) — savdo xavfli`;
    return { block: true, reasonUz: reason, warningUz: reason };
  }

  const hints: string[] = [];
  if (capitalShield.level === "red") {
    hints.push(capitalShield.messagesUz[0] ?? "Kapital himoyasi qizil");
  }
  for (const m of capitalShield.messagesUz) {
    if (!/shartlar normal|Kapital himoyasi: shartlar/i.test(m)) hints.push(m);
  }
  if (discipline.score < 50) {
    hints.push(`Qoidalar ${discipline.score}% — ehtiyot`);
  } else if (discipline.score < 65) {
    hints.push(`Qoidalar ${discipline.score}%`);
  }

  if (hints.length === 0) return { block: false, reasonUz: "" };

  return {
    block: false,
    reasonUz: "",
    warningUz: `${hints.slice(0, 2).join(" · ")} — ehtiyot bilan`,
  };
}

export function shouldBlockNewTrades(input: {
  capitalShield: CapitalShieldState;
  discipline: TradingDiscipline;
  marketQuality: MarketQuality;
}): { block: boolean; reasonUz: string } {
  const { capitalShield, discipline, marketQuality } = input;

  if (!capitalShield.allowNewTrades) {
    return {
      block: true,
      reasonUz: capitalShield.messagesUz[0] ?? "Kapital himoyasi — bugun yangi savdo cheklangan",
    };
  }
  if (!capitalShield.allowed) {
    return {
      block: true,
      reasonUz: capitalShield.messagesUz[0] ?? "Kapital himoyasi — bugun savdo to'xtatilgan",
    };
  }
  if (!marketQuality.tradeable) {
    return {
      block: true,
      reasonUz: `Bozor ${marketQuality.grade} (${marketQuality.score}) — avval shartlarni tuzating`,
    };
  }
  if (discipline.score < 60) {
    return {
      block: true,
      reasonUz: `Qoidalar ${discipline.score}% — bugun lot ochmang (${discipline.passed}/${discipline.total})`,
    };
  }
  return { block: false, reasonUz: "" };
}

export function downgradeVerdictForProtection(
  verdict: HorizonVerdict,
  reasonUz: string
): HorizonVerdict {
  if (verdict.action === "HOLD") return verdict;
  return {
    ...verdict,
    action: "HOLD",
    strength: Math.min(verdict.strength, 48),
    gateAllowed: false,
    reliabilityUz: reasonUz,
    signalUz: `HOLD — ${reasonUz}`,
    analysisUz: `${verdict.analysisUz.slice(0, 140)} · ${reasonUz}`,
    checklist: verdict.checklist.map((c) =>
      c.textUz.startsWith("Gate") ? { ...c, ok: false, textUz: reasonUz.slice(0, 65) } : c
    ),
  };
}

export function downgradeAiSignalForProtection(
  aiSignal: AiTradeSignal,
  reasonUz: string
): AiTradeSignal {
  if (aiSignal.action === "HOLD") return aiSignal;
  return {
    ...aiSignal,
    action: "HOLD",
    confidence: Math.min(aiSignal.confidence, 48),
    summaryUz: `HOLD — ${reasonUz}`,
    analysisUz: `${aiSignal.analysisUz.slice(0, 700)} · ${reasonUz}`,
    triggerUz: "Kapital himoyasi — hozir kirmang",
  };
}

/** Snapshot verdictlarini himoya qoidalari bilan HOLD ga tushirish */
export function applyProfitProtectionToSnapshot(
  snap: MonitorSnapshot,
  input: {
    capitalShield: CapitalShieldState;
    discipline: TradingDiscipline;
    marketQuality: MarketQuality;
  }
): MonitorSnapshot {
  const forecastBlock = shouldBlockAiForecast(input);
  const tradeBlock = shouldBlockNewTrades(input);
  const reasonUz = forecastBlock.block
    ? forecastBlock.reasonUz
    : tradeBlock.block
      ? tradeBlock.reasonUz
      : "";

  if (!reasonUz) return snap;

  let shortStrategy = snap.shortStrategy;
  let strategy = snap.strategy;
  let aiSignal = snap.aiSignal;

  if (shortStrategy?.verdict && shortStrategy.verdict.action !== "HOLD") {
    shortStrategy = {
      ...shortStrategy,
      verdict: downgradeVerdictForProtection(shortStrategy.verdict, reasonUz),
    };
  }
  if (strategy?.verdict && strategy.verdict.action !== "HOLD") {
    strategy = {
      ...strategy,
      verdict: downgradeVerdictForProtection(strategy.verdict, reasonUz),
    };
  }
  if (aiSignal && aiSignal.action !== "HOLD") {
    aiSignal = downgradeAiSignalForProtection(aiSignal, reasonUz);
  }

  return { ...snap, shortStrategy, strategy, aiSignal };
}
