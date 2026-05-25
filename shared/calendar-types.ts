export type CalendarImpact = "high" | "medium" | "low";

export interface EconomicEvent {
  id: string;
  name: string;
  nameUz?: string;
  country: string;
  datetime: string;
  impact: CalendarImpact;
  actual?: string;
  forecast?: string;
  previous?: string;
  currency?: string;
}

export interface CalendarStatus {
  inHighImpactWindow: boolean;
  eventNameUz: string | null;
  minutesUntil: number | null;
  hintUz: string;
  source: "tradingeconomics" | "finnhub" | "heuristic";
  upcoming: EconomicEvent[];
}
