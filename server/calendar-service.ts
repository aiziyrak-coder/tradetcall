import { setCalendarCache } from "../shared/economic-calendar";
import { buildHeuristicCalendarEvents } from "../shared/economic-calendar-heuristic";

const REFRESH_MS = 30 * 60 * 1000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

/** Faqat bepul taxminiy taqvim (NFP/CPI/FOMC) */
export async function refreshEconomicCalendar(): Promise<void> {
  setCalendarCache(buildHeuristicCalendarEvents(), "heuristic");
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
  return null;
}
