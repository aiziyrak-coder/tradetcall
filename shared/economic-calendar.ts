import { computeCalendarStatus } from "./calendar-logic";
import type { CalendarStatus, EconomicEvent } from "./calendar-types";
import { buildHeuristicCalendarEvents } from "./economic-calendar-heuristic";

let cachedEvents: EconomicEvent[] = [];
let cachedSource: CalendarStatus["source"] = "heuristic";
let cachedAt = 0;

export function setCalendarCache(events: EconomicEvent[], source: CalendarStatus["source"]) {
  cachedEvents = events;
  cachedSource = source;
  cachedAt = Date.now();
}

export function getCalendarCacheMeta() {
  return { count: cachedEvents.length, source: cachedSource, cachedAt };
}

export function getCalendarStatus(now = new Date()): CalendarStatus {
  const events =
    cachedEvents.length > 0 ? cachedEvents : buildHeuristicCalendarEvents(now);
  const source = cachedEvents.length > 0 ? cachedSource : "heuristic";
  return computeCalendarStatus(events, source, now);
}

export type { CalendarStatus, EconomicEvent } from "./calendar-types";
