import type { TradeAction } from "./horizon-verdict";

export type JournalOutcome = "pending" | "win" | "loss" | "expired" | "cancelled";

export interface SignalJournalEntry {
  id: string;
  createdAt: string;
  closedAt?: string;
  horizon: "long" | "short";
  action: TradeAction;
  strength: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  priceAtSignal: number;
  outcome: JournalOutcome;
  pnlPts?: number;
  noteUz?: string;
}

export interface SignalJournalSnapshot {
  entries: SignalJournalEntry[];
  stats: {
    total: number;
    wins: number;
    losses: number;
    pending: number;
    winRatePct: number;
    last7WinRatePct: number;
  };
}
