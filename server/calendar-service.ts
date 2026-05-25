import { fetchFinnhubCalendar } from "../shared/finnhub-calendar";
import { setCalendarCache } from "../shared/economic-calendar";
import { buildHeuristicCalendarEvents } from "../shared/economic-calendar-heuristic";
import { fetchTradingEconomicsCalendar } from "../shared/trading-economics-calendar";
import type { EconomicEvent } from "../shared/calendar-types";

const REFRESH_MS = 30 * 60 * 1000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let lastError: string | null = null;

function dateRange(): { from: Date; to: Date } {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date();
  to.setUTCDate(to.getUTCDate() + 7);
  return { from, to };
}

function mergeEvents(lists: EconomicEvent[][]): EconomicEvent[] {
  const map = new Map<string, EconomicEvent>();
  for (const list of lists) {
    for (const e of list) {
      const key = `${e.datetime.slice(0, 16)}-${e.name}`;
      const existing = map.get(key);
      if (!existing || e.impact === "high") map.set(key, e);
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );
}

export async function refreshEconomicCalendar(): Promise<void> {
  const { from, to } = dateRange();
  const teKey = (process.env.TRADING_ECONOMICS_API_KEY || process.env.TE_API_KEY || "").trim();
  const fhKey = (process.env.FINNHUB_API_KEY || "").trim();

  try {
    const batches: EconomicEvent[][] = [];

    if (teKey) {
      try {
        const te = await fetchTradingEconomicsCalendar(teKey, from, to);
        if (te.length) batches.push(te);
      } catch (e) {
        lastError = `TE: ${e instanceof Error ? e.message : "xato"}`;
      }
    }

    if (fhKey) {
      try {
        const fh = await fetchFinnhubCalendar(fhKey, from, to);
        if (fh.length) batches.push(fh);
      } catch (e) {
        lastError = `Finnhub: ${e instanceof Error ? e.message : "xato"}`;
      }
    }

    if (batches.length) {
      const merged = mergeEvents(batches);
      const source = teKey && batches[0]?.length ? "tradingeconomics" : "finnhub";
      setCalendarCache(merged, batches.length > 1 && teKey ? "tradingeconomics" : source);
      lastError = null;
      return;
    }

    setCalendarCache(buildHeuristicCalendarEvents(), "heuristic");
  } catch (e) {
    lastError = e instanceof Error ? e.message : "calendar xato";
    setCalendarCache(buildHeuristicCalendarEvents(), "heuristic");
  }
}

export function startCalendarService(): void {
  if (refreshTimer) return;
  void refreshEconomicCalendar();
  refreshTimer = setInterval(() => void refreshEconomicCalendar(), REFRESH_MS);
}

export function stopCalendarService(): void {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}

export function getCalendarServiceError(): string | null {
  return lastError;
}
