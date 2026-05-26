import type { SignalJournalEntry } from "./signal-journal-types";

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalSignals: number;
  wins: number;
  losses: number;
  expired: number;
  winRatePct: number;
  shortWinRatePct: number;
  longWinRatePct: number;
  bestHorizonUz: string;
  summaryUz: string;
  linesUz: string[];
}

export function buildWeeklyReport(entries: SignalJournalEntry[]): WeeklyReport {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const week = entries.filter((e) => new Date(e.createdAt).getTime() >= weekAgo);

  const closed = week.filter((e) => e.outcome === "win" || e.outcome === "loss");
  const wins = closed.filter((e) => e.outcome === "win").length;
  const losses = closed.filter((e) => e.outcome === "loss").length;
  const expired = week.filter((e) => e.outcome === "expired").length;

  const shortClosed = closed.filter((e) => e.horizon === "short");
  const longClosed = closed.filter((e) => e.horizon === "long");
  const shortWins = shortClosed.filter((e) => e.outcome === "win").length;
  const longWins = longClosed.filter((e) => e.outcome === "win").length;

  const winRatePct =
    closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;
  const shortWinRatePct =
    shortClosed.length > 0 ? Math.round((shortWins / shortClosed.length) * 100) : 0;
  const longWinRatePct =
    longClosed.length > 0 ? Math.round((longWins / longClosed.length) * 100) : 0;

  const bestHorizonUz =
    shortWinRatePct > longWinRatePct + 5
      ? "YAQIN (scalp) yaxshiroq"
      : longWinRatePct > shortWinRatePct + 5
        ? "UZOQ (swing) yaxshiroq"
        : "Ikkalasi teng — filterlarga rioya qiling";

  const weekEnd = new Date(now).toISOString().slice(0, 10);
  const weekStart = new Date(weekAgo).toISOString().slice(0, 10);

  const linesUz = [
    `Hafta: ${weekStart} — ${weekEnd}`,
    `Signallar: ${week.length}, yopilgan: ${closed.length}`,
    `Foyda: ${wins}, zarar: ${losses}, muddati tugagan: ${expired}`,
    `Umumiy win rate: ${winRatePct}%`,
    `YAQIN: ${shortWinRatePct}% (${shortClosed.length} ta)`,
    `UZOQ: ${longWinRatePct}% (${longClosed.length} ta)`,
    `Tavsiya: ${bestHorizonUz}`,
  ];

  const summaryUz =
    closed.length < 5
      ? "Haftada kam signal — statistika ishonchsiz, demo yoki kuzatuv davom eting"
      : winRatePct >= 55
        ? `Yaxshi hafta: ${winRatePct}% muvaffaqiyat. ${bestHorizonUz}.`
        : `Qiyin hafta: ${winRatePct}%. Lot kamaytiring, faqat A/B bozor sifatida savdo qiling.`;

  return {
    weekStart,
    weekEnd,
    totalSignals: week.length,
    wins,
    losses,
    expired,
    winRatePct,
    shortWinRatePct,
    longWinRatePct,
    bestHorizonUz,
    summaryUz,
    linesUz,
  };
}
