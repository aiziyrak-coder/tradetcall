import { setCalendarCache } from "../shared/economic-calendar";
import { buildHeuristicCalendarEvents } from "../shared/economic-calendar-heuristic";
import { fetchForexFactoryCalendar } from "../shared/ff-calendar";

const REFRESH_MS = 30 * 60 * 1000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let lastError: string | null = null;

/** Forex Factory (bepul) + taxminiy fallback */
export async function refreshEconomicCalendar(): Promise<void> {
  const ff = await fetchForexFactoryCalendar();
  if (ff.length >= 3) {
    setCalendarCache(ff, "forexfactory");
    lastError = null;
    return;
  }
  setCalendarCache(buildHeuristicCalendarEvents(), "heuristic");
  lastError = ff.length === 0 ? "FF taqvim yuklanmadi — taxminiy rejim" : null;
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
