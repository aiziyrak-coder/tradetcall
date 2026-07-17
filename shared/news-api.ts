/**
 * Ixtiyoriy yangilik API (Finnhub / NewsAPI) + server cache 12 daqiqa.
 * Kalit yo'q bo'lsa — faqat RSS (feeds.ts) ishlaydi. Fake kalit ishlatilmaydi.
 *
 * Tavsiya:
 * - Finnhub free: /news?category=general + keyword filter (FINNHUB_API_KEY)
 * - NewsAPI.org: NEWS_API_KEY (developer plan — faqat lokal/dev)
 */

import { GOLD_KEYWORDS, isGoldRelated, timeAgoUz } from "./feeds";
import type { GoldNewsBundle, NewsItem, NewsStream } from "./types";
import { fetchJson } from "./fetch-util";

const CACHE_MS = 12 * 60_000;

let cached: GoldNewsBundle | null = null;
let cachedAt = 0;

function classifyStream(text: string): NewsStream {
  if (/geopolit|war|sanction|conflict|middle.?east|ukraine|israel|taiwan/i.test(text)) {
    return "geopolitics";
  }
  if (/fed\b|fomc|inflation|cpi|ppi|dollar|dxy|treasury|rate|powell|ecb|macro/i.test(text)) {
    return "macro";
  }
  return "direct";
}

function toItem(
  id: string,
  title: string,
  summary: string,
  link: string,
  source: string,
  publishedAt: string
): NewsItem | null {
  const blob = `${title} ${summary}`;
  if (!isGoldRelated(blob) && !GOLD_KEYWORDS.test(blob)) return null;
  const iso = publishedAt || new Date().toISOString();
  return {
    id,
    title: title.slice(0, 220),
    summary: summary.slice(0, 400),
    link: link || "#",
    source,
    publishedAt: iso,
    stream: classifyStream(blob),
    timeAgo: timeAgoUz(iso),
    goldRelated: true,
  };
}

async function fetchFinnhubNews(token: string): Promise<NewsItem[]> {
  const url = `https://finnhub.io/api/v1/news?category=general&token=${encodeURIComponent(token)}`;
  const rows = await fetchJson<
    { id?: number; headline?: string; summary?: string; url?: string; source?: string; datetime?: number }[]
  >(url, { timeoutMs: 12_000, retries: 1 });
  if (!Array.isArray(rows)) return [];
  const out: NewsItem[] = [];
  for (const r of rows.slice(0, 80)) {
    const iso = r.datetime ? new Date(r.datetime * 1000).toISOString() : new Date().toISOString();
    const item = toItem(
      `fh-${r.id ?? r.url ?? Math.random()}`,
      r.headline ?? "",
      r.summary ?? "",
      r.url ?? "",
      r.source ?? "Finnhub",
      iso
    );
    if (item) out.push(item);
  }
  return out;
}

async function fetchNewsApi(token: string): Promise<NewsItem[]> {
  const q = encodeURIComponent("gold OR XAU OR Fed OR geopolitical OR inflation");
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=40&apiKey=${encodeURIComponent(token)}`;
  const data = await fetchJson<{
    articles?: { title?: string; description?: string; url?: string; source?: { name?: string }; publishedAt?: string }[];
  }>(url, { timeoutMs: 12_000, retries: 1 });
  const out: NewsItem[] = [];
  for (const a of data?.articles ?? []) {
    const item = toItem(
      `na-${a.url ?? a.title ?? Math.random()}`,
      a.title ?? "",
      a.description ?? "",
      a.url ?? "",
      a.source?.name ?? "NewsAPI",
      a.publishedAt ?? new Date().toISOString()
    );
    if (item) out.push(item);
  }
  return out;
}

function bundleOf(items: NewsItem[]): GoldNewsBundle {
  return {
    direct: items.filter((i) => i.stream === "direct").slice(0, 20),
    macro: items.filter((i) => i.stream === "macro").slice(0, 20),
    geopolitics: items.filter((i) => i.stream === "geopolitics").slice(0, 20),
  };
}

/** Background cache — kalit bo'lsa API, aks holda null (RSS ishlatiladi) */
export async function fetchCachedApiNews(): Promise<GoldNewsBundle | null> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_MS) return cached;

  const finnhub = process.env.FINNHUB_API_KEY?.trim();
  const newsApi = process.env.NEWS_API_KEY?.trim();
  if (!finnhub && !newsApi) return null;

  try {
    let items: NewsItem[] = [];
    if (finnhub) items = await fetchFinnhubNews(finnhub);
    else if (newsApi) items = await fetchNewsApi(newsApi);
    if (!items.length) return cached;
    cached = bundleOf(items);
    cachedAt = now;
    return cached;
  } catch (e) {
    console.warn("[news-api] fetch failed:", e instanceof Error ? e.message : e);
    return cached;
  }
}

export function mergeNewsBundles(primary: GoldNewsBundle, extra: GoldNewsBundle | null): GoldNewsBundle {
  if (!extra) return primary;
  const dedupe = (a: NewsItem[], b: NewsItem[]) => {
    const seen = new Set(a.map((x) => x.link || x.title));
    const merged = [...a];
    for (const x of b) {
      const key = x.link || x.title;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(x);
    }
    return merged.slice(0, 20);
  };
  return {
    direct: dedupe(primary.direct, extra.direct),
    macro: dedupe(primary.macro, extra.macro),
    geopolitics: dedupe(primary.geopolitics, extra.geopolitics),
  };
}
