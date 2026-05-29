import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { TradeAction } from "../shared/horizon-verdict";
import type {
  JournalOutcome,
  SignalJournalEntry,
  SignalJournalSnapshot,
} from "../shared/signal-journal-types";
import type { JournalStats } from "../shared/platform-insight";
import { buildWeeklyReport } from "../shared/weekly-report";
import { triggerLossPause, getPauseUntil } from "./shield-runtime";
import { DEFAULT_CAPITAL_SHIELD } from "../shared/capital-shield";

function maybeTriggerLossPause(): void {
  const today = new Date().toISOString().slice(0, 10);
  const closed = loadFile()
    .entries.filter((e) => e.createdAt.startsWith(today))
    .filter((e) => e.outcome === "win" || e.outcome === "loss");
  let consecutiveLosses = 0;
  for (const e of [...closed].reverse()) {
    if (e.outcome === "loss") consecutiveLosses += 1;
    else break;
  }
  if (consecutiveLosses >= DEFAULT_CAPITAL_SHIELD.pauseAfterLosses && !getPauseUntil()) {
    triggerLossPause(DEFAULT_CAPITAL_SHIELD.pauseCooldownMinutes);
  }
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = process.env.TRADE_DATA_DIR || path.join(root, "data");
const JOURNAL_FILE = path.join(DATA_DIR, "signal-journal.json");
const MAX_ENTRIES = 500;

interface JournalFile {
  entries: SignalJournalEntry[];
}

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadFile(): JournalFile {
  ensureDir();
  if (!fs.existsSync(JOURNAL_FILE)) return { entries: [] };
  try {
    return JSON.parse(fs.readFileSync(JOURNAL_FILE, "utf8")) as JournalFile;
  } catch {
    return { entries: [] };
  }
}

function saveFile(data: JournalFile): void {
  ensureDir();
  fs.writeFileSync(JOURNAL_FILE, JSON.stringify(data, null, 2), "utf8");
}

function statsFromEntries(entries: SignalJournalEntry[]): JournalStats {
  const closed = entries.filter((e) => e.outcome === "win" || e.outcome === "loss");
  const wins = closed.filter((e) => e.outcome === "win").length;
  const losses = closed.filter((e) => e.outcome === "loss").length;
  const pending = entries.filter((e) => e.outcome === "pending").length;
  const winRatePct =
    closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const last7 = closed.filter((e) => new Date(e.createdAt).getTime() >= weekAgo);
  const last7Wins = last7.filter((e) => e.outcome === "win").length;
  const last7WinRatePct =
    last7.length > 0 ? Math.round((last7Wins / last7.length) * 100) : 0;

  return {
    total: entries.length,
    wins,
    losses,
    pending,
    winRatePct,
    last7WinRatePct,
  };
}

export function getJournalSnapshot(): SignalJournalSnapshot {
  const { entries } = loadFile();
  return { entries: entries.slice(0, 100), stats: statsFromEntries(entries) };
}

export function getJournalStats(): JournalStats {
  return statsFromEntries(loadFile().entries);
}

export function getTodayShieldStats(accountUsd = 1000): {
  dateKey: string;
  trades: number;
  wins: number;
  losses: number;
  estimatedLossPct: number;
  estimatedProfitPct: number;
  consecutiveLosses: number;
  pauseUntil: string | null;
} {
  const today = new Date().toISOString().slice(0, 10);
  const entries = loadFile().entries.filter((e) => e.createdAt.startsWith(today));
  const closed = entries.filter((e) => e.outcome === "win" || e.outcome === "loss");
  const wins = closed.filter((e) => e.outcome === "win").length;
  const losses = closed.filter((e) => e.outcome === "loss").length;

  let profitUsd = 0;
  let lossUsd = 0;
  for (const e of closed) {
    const moveUsd = e.pnlPts ?? 0;
    if (e.outcome === "win" && moveUsd > 0) profitUsd += moveUsd;
    if (e.outcome === "loss") lossUsd += Math.abs(moveUsd);
  }
  const base = Math.max(accountUsd, 100);
  const estimatedProfitPct = Math.round((profitUsd / base) * 1000) / 10;
  const estimatedLossPct = Math.round((lossUsd / base) * 1000) / 10;

  let consecutiveLosses = 0;
  for (const e of [...closed].reverse()) {
    if (e.outcome === "loss") consecutiveLosses += 1;
    else if (e.outcome === "win") break;
  }

  return {
    dateKey: today,
    trades: entries.length,
    wins,
    losses,
    estimatedLossPct,
    estimatedProfitPct,
    consecutiveLosses,
    pauseUntil: getPauseUntil(),
  };
}

export function getWeeklyReportExport() {
  return buildWeeklyReport(loadFile().entries);
}

export function setJournalNote(id: string, noteUz: string): boolean {
  const file = loadFile();
  const e = file.entries.find((x) => x.id === id);
  if (!e) return false;
  e.noteUz = noteUz.slice(0, 500);
  saveFile(file);
  return true;
}

let lastRecorded: { short: string; long: string } = { short: "", long: "" };

export function recordSignalIfNew(input: {
  horizon: "long" | "short";
  action: TradeAction;
  strength: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  price: number;
}): SignalJournalEntry | null {
  if (input.action !== "BUY" && input.action !== "SELL") return null;
  const key = `${input.horizon}:${input.action}:${Math.round(input.strength)}`;
  const prev = input.horizon === "short" ? lastRecorded.short : lastRecorded.long;
  if (prev === key) return null;
  if (input.horizon === "short") lastRecorded.short = key;
  else lastRecorded.long = key;

  const entry: SignalJournalEntry = {
    id: `${Date.now()}-${input.horizon}-${input.action}`,
    createdAt: new Date().toISOString(),
    horizon: input.horizon,
    action: input.action,
    strength: input.strength,
    entry: input.entry,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    priceAtSignal: input.price,
    outcome: "pending",
  };

  const file = loadFile();
  file.entries.unshift(entry);
  if (file.entries.length > MAX_ENTRIES) file.entries.length = MAX_ENTRIES;
  saveFile(file);
  return entry;
}

export function resolvePendingSignals(price: number): void {
  const file = loadFile();
  let changed = false;
  const horizonMaxMs = { short: 35 * 60 * 1000, long: 48 * 60 * 60 * 1000 };

  for (const e of file.entries) {
    if (e.outcome !== "pending") continue;
    const age = Date.now() - new Date(e.createdAt).getTime();
    const maxAge = horizonMaxMs[e.horizon];
    const sl = e.stopLoss;
    const tp = e.takeProfit;
    let resolved = false;

    if (e.action === "BUY") {
      if (price <= sl) {
        e.outcome = "loss";
        e.pnlPts = price - e.priceAtSignal;
        e.noteUz = "SL tegildi";
        resolved = true;
      } else if (price >= tp) {
        e.outcome = "win";
        e.pnlPts = price - e.priceAtSignal;
        e.noteUz = "TP erishildi";
        resolved = true;
      }
    } else if (e.action === "SELL") {
      if (price >= sl) {
        e.outcome = "loss";
        e.pnlPts = e.priceAtSignal - price;
        e.noteUz = "SL tegildi";
        resolved = true;
      } else if (price <= tp) {
        e.outcome = "win";
        e.pnlPts = e.priceAtSignal - price;
        e.noteUz = "TP erishildi";
        resolved = true;
      }
    }

    if (!resolved && age > maxAge) {
      e.outcome = "expired";
      e.noteUz = "Vaqt tugadi";
      resolved = true;
    }

    if (resolved) {
      e.closedAt = new Date().toISOString();
      changed = true;
      if (e.outcome === "loss") maybeTriggerLossPause();
    }
  }

  if (changed) saveFile(file);
}

export function markJournalOutcome(
  id: string,
  outcome: JournalOutcome,
  noteUz?: string
): boolean {
  const file = loadFile();
  const e = file.entries.find((x) => x.id === id);
  if (!e) return false;
  e.outcome = outcome;
  e.closedAt = new Date().toISOString();
  if (noteUz) e.noteUz = noteUz;
  saveFile(file);
  return true;
}
