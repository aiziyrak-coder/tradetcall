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

/** YANGI PROGNOZ — hech qachon bloklanmaydi; faqat ogohlantirish */
export function shouldBlockAiForecast(input: {
  capitalShield: CapitalShieldState;
  discipline: TradingDiscipline;
  marketQuality: MarketQuality;
}): { block: boolean; reasonUz: string; warningUz?: string } {
  const { capitalShield, discipline, marketQuality } = input;

  const hints: string[] = [];
  for (const m of capitalShield.messagesUz) {
    if (!/shartlar normal|Kapital himoyasi: shartlar/i.test(m)) hints.push(m);
  }
  if (!marketQuality.tradeable) {
    hints.push(`Bozor ${marketQuality.grade} (${marketQuality.score})`);
  }
  if (discipline.score < 55) {
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

/** Snapshot verdictlarini himoya qoidalari bilan HOLD ga tushirish */
export function applyProfitProtectionToSnapshot(
  snap: MonitorSnapshot,
  input: {
    capitalShield: CapitalShieldState;
    discipline: TradingDiscipline;
    marketQuality: MarketQuality;
  }
): MonitorSnapshot {
  const { block, reasonUz } = shouldBlockNewTrades(input);
  if (!block) return snap;

  let shortStrategy = snap.shortStrategy;
  let strategy = snap.strategy;

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

  return { ...snap, shortStrategy, strategy };
}
