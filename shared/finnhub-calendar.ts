import { fetchJson } from "./fetch-util";
import type { EconomicEvent } from "./calendar-types";

interface FinnhubRow {
  country?: string;
  event?: string;
  time?: string;
  impact?: string;
  actual?: number | string;
  estimate?: number | string;
  prev?: number | string;
  unit?: string;
}

interface FinnhubResponse {
  economicCalendar?: FinnhubRow[];
}

function mapImpact(impact?: string): "high" | "medium" | "low" {
  const i = (impact ?? "").toLowerCase();
  if (i === "high" || i === "3") return "high";
  if (i === "medium" || i === "2") return "medium";
  return "low";
}

export async function fetchFinnhubCalendar(
  apiKey: string,
  from: Date,
  to: Date
): Promise<EconomicEvent[]> {
  const f = from.toISOString().slice(0, 10);
  const t = to.toISOString().slice(0, 10);
  const url = `https://finnhub.io/api/v1/calendar/economic?from=${f}&to=${t}&token=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson<FinnhubResponse>(url, { timeoutMs: 12000, retries: 1 });
  const rows = data?.economicCalendar ?? [];
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((r) => r.event && r.time)
    .filter((r) => (r.country ?? "").toLowerCase().includes("us") || r.country === "US")
    .map((r, i) => ({
      id: `fh-${r.time}-${r.event}-${i}`,
      name: r.event!,
      country: r.country ?? "US",
      datetime: new Date(r.time!).toISOString(),
      impact: mapImpact(r.impact),
      actual: r.actual != null ? String(r.actual) : undefined,
      forecast: r.estimate != null ? String(r.estimate) : undefined,
      previous: r.prev != null ? String(r.prev) : undefined,
      currency: r.unit,
    }));
}
