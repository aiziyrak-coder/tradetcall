import type { CalendarImpact, CalendarStatus, EconomicEvent } from "./calendar-types";

const EVENT_UZ: Record<string, string> = {
  "Non Farm Payrolls": "NFP ish bozori",
  "Nonfarm Payrolls": "NFP ish bozori",
  "CPI": "CPI inflyatsiya",
  "Consumer Price Index": "CPI inflyatsiya",
  "Core CPI": "Core CPI",
  "FOMC": "FOMC / Fed",
  "Interest Rate": "Foiz stavkasi",
  "Fed Interest Rate": "Fed foiz",
  "GDP": "YaIM GDP",
  "Retail Sales": "Chakana savdo",
  "Unemployment Rate": "Ishsizlik",
  "Initial Jobless Claims": "Ishsizlik arizalari",
  "PPI": "PPI",
  "ISM Manufacturing": "ISM ishlab chiqarish",
};

function nameToUz(name: string): string {
  for (const [k, v] of Object.entries(EVENT_UZ)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return name.length > 48 ? name.slice(0, 45) + "…" : name;
}

function minutesDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

function impactWeight(impact: CalendarImpact): number {
  if (impact === "high") return 3;
  if (impact === "medium") return 2;
  return 1;
}

const WINDOW_BEFORE_HIGH = 45;
const WINDOW_AFTER_HIGH = 60;
const WINDOW_BEFORE_MED = 25;
const WINDOW_AFTER_MED = 35;

export function enrichEvents(events: EconomicEvent[]): EconomicEvent[] {
  return events.map((e) => ({
    ...e,
    nameUz: e.nameUz ?? nameToUz(e.name),
  }));
}

export function computeCalendarStatus(
  events: EconomicEvent[],
  source: CalendarStatus["source"],
  now = new Date()
): CalendarStatus {
  const sorted = enrichEvents(events)
    .filter((e) => {
      const t = new Date(e.datetime).getTime();
      return t >= now.getTime() - 2 * 3600000 && t <= now.getTime() + 48 * 3600000;
    })
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const upcoming = sorted.filter((e) => new Date(e.datetime) >= now).slice(0, 8);

  for (const ev of sorted) {
    const at = new Date(ev.datetime);
    const before = ev.impact === "high" ? WINDOW_BEFORE_HIGH : WINDOW_BEFORE_MED;
    const after = ev.impact === "high" ? WINDOW_AFTER_HIGH : WINDOW_AFTER_MED;
    const start = new Date(at.getTime() - before * 60000);
    const end = new Date(at.getTime() + after * 60000);
    if (now >= start && now <= end && impactWeight(ev.impact) >= 2) {
      return {
        inHighImpactWindow: true,
        eventNameUz: ev.nameUz ?? ev.name,
        minutesUntil: minutesDiff(at, now),
        hintUz: `${ev.nameUz ?? ev.name} · ${ev.impact} — ${before + after} daqiqa oyna: savdo ochmang.`,
        source,
        upcoming,
      };
    }
  }

  const next = upcoming[0];
  if (next) {
    const at = new Date(next.datetime);
    const diff = minutesDiff(at, now);
    if (diff > 0 && diff < 24 * 60) {
      return {
        inHighImpactWindow: false,
        eventNameUz: next.nameUz ?? next.name,
        minutesUntil: diff,
        hintUz: `${next.nameUz ?? next.name} ~${diff} daqiqadan keyin · ${next.impact}.`,
        source,
        upcoming,
      };
    }
  }

  return {
    inHighImpactWindow: false,
    eventNameUz: null,
    minutesUntil: null,
    hintUz: "NFP/CPI/FOMC oynalari — yuqori ta'sir atrofida avtomatik HOLD.",
    source,
    upcoming,
  };
}
