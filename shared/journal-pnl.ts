import type { SignalJournalEntry } from "./signal-journal-types";
import { calcPositionSize } from "./risk-calculator";

/** Journal yopilishidagi depozitga ta'sir ($) — SL/TP masofasi va risk % bo'yicha */
export function journalImpactUsd(
  entry: SignalJournalEntry,
  accountUsd: number,
  riskPercent = 1
): number {
  if (entry.outcome !== "win" && entry.outcome !== "loss") return 0;

  const slDist = Math.abs(entry.entry - entry.stopLoss);
  const tpDist = Math.abs(entry.takeProfit - entry.entry);
  if (slDist < 0.01) return 0;

  const move = Math.abs(entry.pnlPts ?? 0);
  const risk = calcPositionSize({
    accountUsd,
    riskPercent,
    entry: entry.entry,
    stopLoss: entry.stopLoss,
  });
  const maxLossUsd = risk.riskUsd;
  if (maxLossUsd <= 0) return 0;

  if (entry.outcome === "loss") {
    const frac = Math.min(1, move / slDist);
    return maxLossUsd * frac;
  }

  const winDist = tpDist > 0.01 ? tpDist : slDist;
  const frac = Math.min(1, move / winDist);
  const maxWinUsd = maxLossUsd * (winDist / slDist);
  return maxWinUsd * frac;
}

export function journalImpactPct(
  entry: SignalJournalEntry,
  accountUsd: number,
  riskPercent = 1
): number {
  const base = Math.max(accountUsd, 100);
  return (journalImpactUsd(entry, accountUsd, riskPercent) / base) * 100;
}
