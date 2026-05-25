import { fetchJson } from "./fetch-util";
import type { EconomicEvent } from "./calendar-types";

interface TeRow {
  CalendarId?: string;
  Date?: string;
  Country?: string;
  Category?: string;
  Event?: string;
  Importance?: number;
  Actual?: string;
  Forecast?: string;
  Previous?: string;
  Currency?: string;
}

export async function fetchTradingEconomicsCalendar(
  apiKey: string,
  from: Date,
  to: Date
): Promise<EconomicEvent[]> {
  const f = from.toISOString().slice(0, 10);
  const t = to.toISOString().slice(0, 10);
  const url = `https://api.tradingeconomics.com/calendar/country/united%20states/${f}/${t}?c=${encodeURIComponent(apiKey)}`;
  const rows = await fetchJson<TeRow[]>(url, { timeoutMs: 12000, retries: 1 });
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((r) => r.Event && r.Date)
    .map((r) => {
      const imp = r.Importance ?? 1;
      const impact =
        imp >= 3 ? "high" : imp >= 2 ? "medium" : ("low" as const);
      return {
        id: `te-${r.CalendarId ?? r.Event}-${r.Date}`,
        name: r.Event!,
        country: r.Country ?? "United States",
        datetime: new Date(r.Date!).toISOString(),
        impact,
        actual: r.Actual,
        forecast: r.Forecast,
        previous: r.Previous,
        currency: r.Currency,
      };
    });
}
