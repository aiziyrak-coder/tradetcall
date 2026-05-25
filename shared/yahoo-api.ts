/** Yahoo chart API javoblari — esbuild uchun alohida interfeyslar */

export interface YahooChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketTime?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
}

export interface YahooQuoteRow {
  open?: (number | null)[];
  high?: (number | null)[];
  low?: (number | null)[];
  close?: (number | null)[];
}

export interface YahooChartResult {
  meta?: YahooChartMeta;
  timestamp?: number[];
  indicators?: { quote?: YahooQuoteRow[] };
}

export interface YahooChartResponse {
  chart?: { result?: YahooChartResult[] };
}
