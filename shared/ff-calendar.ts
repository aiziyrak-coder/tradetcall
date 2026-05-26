import type { EconomicEvent } from "./calendar-types";
import { fetchJson } from "./fetch-util";

interface FfRow {
  title?: string;
  country?: string;
  date?: string;
  time?: string;
  impact?: string;
  forecast?: string;
  previous?: string;
}

const FF_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

function mapImpact(raw?: string): EconomicEvent["impact"] {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("high")) return "high";
  if (s.includes("medium") || s.includes("med")) return "medium";
  return "low";
}

function goldRelated(title: string, country: string, impact: EconomicEvent["impact"]): boolean {
  if (impact === "high") return true;
  const t = `${title} ${country}`.toLowerCase();
  return /gold|xau|fed|fomc|cpi|ppi|nfp|payroll|gdp|inflation|rate|pmi|dxy|dollar/.test(t);
}

/** Bepul Forex Factory haftalik taqvim (JSON) */
export async function fetchForexFactoryCalendar(): Promise<EconomicEvent[]> {
  try {
    const rows = await fetchJson<FfRow[]>(FF_URL, { timeoutMs: 12000, retries: 1 });
    if (!Array.isArray(rows)) return [];

    const events: EconomicEvent[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const title = (r.title ?? "").trim();
      if (!title || !r.date) continue;
      const country = (r.country ?? "USD").trim();
      const impact = mapImpact(r.impact);
      if (!goldRelated(title, country, impact)) continue;

      const timePart = (r.time ?? "00:00").trim();
      const iso = `${r.date}T${timePart.length <= 5 ? timePart : "00:00"}:00.000Z`;
      const dt = new Date(iso);
      if (Number.isNaN(dt.getTime())) continue;

      events.push({
        id: `ff-${i}-${r.date}-${title.slice(0, 20)}`,
        name: title,
        nameUz: title,
        country,
        datetime: dt.toISOString(),
        impact: mapImpact(r.impact),
        forecast: r.forecast,
        previous: r.previous,
        currency: country.includes("USD") ? "USD" : country,
      });
    }

    return events.sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
  } catch {
    return [];
  }
}
