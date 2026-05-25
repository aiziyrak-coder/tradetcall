import Parser from "rss-parser";
import type { GoldNewsBundle, NewsItem, NewsStream } from "./types";

const parser = new Parser({
  timeout: 12000,
  headers: { "User-Agent": "XAUUSD-Gold-Desktop/3.0" },
});

const GOLD_FEEDS: { url: string; name: string; stream: NewsStream }[] = [
  { url: "https://www.kitco.com/rss/kitconews.xml", name: "Kitco", stream: "direct" },
  { url: "https://www.fxstreet.com/rss/news", name: "FXStreet", stream: "direct" },
  {
    url: "https://news.google.com/rss/search?q=gold+price+XAUUSD+bullion&hl=en-US&gl=US&ceid=US:en",
    name: "Google Oltin",
    stream: "direct",
  },
  {
    url: "https://news.google.com/rss/search?q=COMEX+gold+futures&hl=en-US&gl=US&ceid=US:en",
    name: "Google COMEX",
    stream: "direct",
  },
  {
    url: "https://news.google.com/rss/search?q=central+bank+gold+reserves+buying&hl=en-US&gl=US&ceid=US:en",
    name: "Markaziy banklar",
    stream: "direct",
  },
  {
    url: "https://news.google.com/rss/search?q=Federal+Reserve+interest+rates+inflation&hl=en-US&gl=US&ceid=US:en",
    name: "Fed / inflyatsiya",
    stream: "macro",
  },
  {
    url: "https://news.google.com/rss/search?q=US+dollar+index+DXY+treasury+yields&hl=en-US&gl=US&ceid=US:en",
    name: "Dollar / renta",
    stream: "macro",
  },
  {
    url: "https://news.google.com/rss/search?q=CPI+PPI+inflation+data+gold&hl=en-US&gl=US&ceid=US:en",
    name: "CPI / PPI",
    stream: "macro",
  },
  {
    url: "https://feeds.feedburner.com/zerohedge/feed", name: "ZeroHedge", stream: "macro" },
  {
    url: "https://news.google.com/rss/search?q=geopolitical+risk+safe+haven+gold&hl=en-US&gl=US&ceid=US:en",
    name: "Xavfsiz boshpana",
    stream: "geopolitics",
  },
  {
    url: "https://news.google.com/rss/search?q=war+sanctions+oil+middle+east+gold&hl=en-US&gl=US&ceid=US:en",
    name: "Urush / sanktsiya",
    stream: "geopolitics",
  },
  {
    url: "https://news.google.com/rss/search?q=trade+war+tariffs+gold+market&hl=en-US&gl=US&ceid=US:en",
    name: "Savdo urushi",
    stream: "geopolitics",
  },
];

export const GOLD_KEYWORDS =
  /gold|xau|xauusd|bullion|precious.?metal|gld\b|comex|silver|kumush|fed\b|fomc|powell|inflation|cpi|ppi|stagflation|dollar|dxy|treasury|yield|rate.?cut|rate.?hike|real.?yield|geopolit|war|conflict|sanction|safe.?haven|central.?bank|reserve|imf|brics|mining|tariff|recession|stimulus|etf.*gold|spot.?gold/i;

function clean(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function timeAgoUz(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} soat oldin`;
  return `${Math.floor(hrs / 24)} kun oldin`;
}

export function isGoldRelated(text: string): boolean {
  return GOLD_KEYWORDS.test(text);
}

async function parseFeed(feed: { url: string; name: string; stream: NewsStream }): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  try {
    const parsed = await parser.parseURL(feed.url);
    for (const item of parsed.items.slice(0, 15)) {
      const title = clean(item.title ?? "");
      if (!title) continue;
      const summary = clean(
        item.contentSnippet ?? item.summary ?? item.content ?? title
      ).slice(0, 450);
      const text = `${title} ${summary}`;
      if (!isGoldRelated(text)) continue;

      const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
      items.push({
        id: `${feed.stream}-${feed.name}-${item.guid ?? title}`.slice(0, 90),
        title,
        summary,
        link: item.link ?? "#",
        source: feed.name,
        publishedAt,
        stream: feed.stream,
        timeAgo: timeAgoUz(publishedAt),
        alert: /breaking|urgent|crisis|war|attack|emergency|surge|plunge|record/i.test(text),
        goldRelated: true,
      });
    }
  } catch {
    /* skip */
  }
  return items;
}

function dedupeAndSort(items: NewsItem[], limit: number): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )) {
    const key = item.title.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/** Faqat oltin va oltin narxiga ta'sir qiluvchi yangiliklar */
export async function fetchGoldNews(): Promise<GoldNewsBundle> {
  const all = await Promise.all(GOLD_FEEDS.map(parseFeed));
  const merged = all.flat();

  const direct = dedupeAndSort(
    merged.filter((i) => i.stream === "direct"),
    28
  );
  const macro = dedupeAndSort(
    merged.filter((i) => i.stream === "macro"),
    20
  );
  const geopolitics = dedupeAndSort(
    merged.filter((i) => i.stream === "geopolitics"),
    20
  );

  return { direct, macro, geopolitics };
}

export function allGoldNewsItems(bundle: GoldNewsBundle): NewsItem[] {
  return [...bundle.direct, ...bundle.macro, ...bundle.geopolitics];
}
