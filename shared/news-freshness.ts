import type { GoldNewsBundle } from "./types";

export interface NewsFreshness {
  newestMinutesAgo: number | null;
  oldestMinutesAgo: number | null;
  totalItems: number;
  stale: boolean;
  freshnessUz: string;
}

function parseAge(item: { publishedAt: string }): number | null {
  const t = new Date(item.publishedAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((Date.now() - t) / 60_000);
}

/** RSS kechikishi — muhim daqiqalarda ogohlantirish */
export function analyzeNewsFreshness(news: GoldNewsBundle): NewsFreshness {
  const items = [...news.direct, ...news.macro, ...news.geopolitics];
  const ages = items.map(parseAge).filter((a): a is number => a != null && a >= 0);

  if (ages.length === 0) {
    return {
      newestMinutesAgo: null,
      oldestMinutesAgo: null,
      totalItems: 0,
      stale: true,
      freshnessUz: "Yangiliklar yo'q — signal ishonchi past",
    };
  }

  const newest = Math.min(...ages);
  const oldest = Math.max(...ages);
  const stale = newest > 45;

  const freshnessUz = stale
    ? `Eng yangi yangilik ${newest} daqiqa oldin — tez bozor uchun ehtiyot`
    : newest <= 10
      ? `Yangiliklar yangi (${newest} daqiqa)`
      : `Yangiliklar ${newest}–${oldest} daqiqa oralig'ida`;

  return {
    newestMinutesAgo: newest,
    oldestMinutesAgo: oldest,
    totalItems: items.length,
    stale,
    freshnessUz,
  };
}
