/** Yuqori ta'sirli AQSh voqealari — avtomatik kutish oynasi (UTC) */

export interface CalendarStatus {
  inHighImpactWindow: boolean;
  eventNameUz: string | null;
  minutesUntil: number | null;
  hintUz: string;
}

function firstFridayUtc(year: number, month: number): Date {
  const d = new Date(Date.UTC(year, month, 1, 12, 30, 0));
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function minutesDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

function inWindow(now: Date, event: Date, beforeMin: number, afterMin: number): boolean {
  const start = new Date(event.getTime() - beforeMin * 60000);
  const end = new Date(event.getTime() + afterMin * 60000);
  return now >= start && now <= end;
}

/** NFP, CPI taxminiy oynalar, FOMC 2/4-chorak chorshanba */
export function getCalendarStatus(now = new Date()): CalendarStatus {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const events: { at: Date; nameUz: string }[] = [];

  events.push({ at: firstFridayUtc(y, m), nameUz: "NFP (ish bozori)" });

  const cpiDay = new Date(Date.UTC(y, m, 12, 12, 30, 0));
  let tues = 0;
  for (let d = 8; d <= 14 && tues < 1; d++) {
    const x = new Date(Date.UTC(y, m, d, 12, 30, 0));
    if (x.getUTCDay() === 2) {
      events.push({ at: x, nameUz: "CPI / inflyatsiya" });
      tues++;
    }
  }

  for (let d = 1; d <= 28; d++) {
    const x = new Date(Date.UTC(y, m, d, 18, 0, 0));
    if (x.getUTCDay() === 3) {
      const week = Math.ceil(d / 7);
      if (week === 2 || week === 4) {
        events.push({ at: x, nameUz: "FOMC / Fed" });
      }
    }
  }

  const WINDOW_BEFORE = 45;
  const WINDOW_AFTER = 60;

  for (const ev of events) {
    if (inWindow(now, ev.at, WINDOW_BEFORE, WINDOW_AFTER)) {
      return {
        inHighImpactWindow: true,
        eventNameUz: ev.nameUz,
        minutesUntil: minutesDiff(ev.at, now),
        hintUz: `${ev.nameUz} atrofida — spread keng, signal yolg'on. 45–60 daqiqa kuting.`,
      };
    }
  }

  let nearest: { at: Date; nameUz: string } | null = null;
  let nearestMin = Infinity;
  for (const ev of events) {
    const diff = minutesDiff(ev.at, now);
    if (diff > 0 && diff < nearestMin && diff < 24 * 60) {
      nearestMin = diff;
      nearest = ev;
    }
  }

  if (nearest) {
    return {
      inHighImpactWindow: false,
      eventNameUz: nearest.nameUz,
      minutesUntil: nearestMin,
      hintUz: `${nearest.nameUz} ~${nearestMin} daqiqadan keyin — pozitsiya ochishdan oldin reja.`,
    };
  }

  return {
    inHighImpactWindow: false,
    eventNameUz: null,
    minutesUntil: null,
    hintUz: "Yaqin yuqori ta'sir oynasi aniqlanmadi — standart risk qoidalari.",
  };
}
