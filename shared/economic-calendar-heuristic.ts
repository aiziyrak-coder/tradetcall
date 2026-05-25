import type { EconomicEvent } from "./calendar-types";

function firstFridayUtc(year: number, month: number): Date {
  const d = new Date(Date.UTC(year, month, 1, 12, 30, 0));
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/** API kalitsiz taxminiy AQSh voqealari */
export function buildHeuristicCalendarEvents(now = new Date()): EconomicEvent[] {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const events: EconomicEvent[] = [];

  events.push({
    id: `heur-nfp-${y}-${m}`,
    name: "Non Farm Payrolls",
    nameUz: "NFP ish bozori",
    country: "US",
    datetime: firstFridayUtc(y, m).toISOString(),
    impact: "high",
  });

  for (let d = 8; d <= 14; d++) {
    const x = new Date(Date.UTC(y, m, d, 12, 30, 0));
    if (x.getUTCDay() === 2) {
      events.push({
        id: `heur-cpi-${y}-${m}`,
        name: "CPI",
        nameUz: "CPI / inflyatsiya",
        country: "US",
        datetime: x.toISOString(),
        impact: "high",
      });
      break;
    }
  }

  for (let d = 1; d <= 28; d++) {
    const x = new Date(Date.UTC(y, m, d, 18, 0, 0));
    if (x.getUTCDay() === 3) {
      const week = Math.ceil(d / 7);
      if (week === 2 || week === 4) {
        events.push({
          id: `heur-fomc-${y}-${m}-${d}`,
          name: "FOMC Rate Decision",
          nameUz: "FOMC / Fed",
          country: "US",
          datetime: x.toISOString(),
          impact: "high",
        });
      }
    }
  }

  return events;
}
