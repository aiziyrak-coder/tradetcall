import type { GoldNewsBundle, NewsItem } from "./types";

export interface TranslationCache {
  [articleId: string]: {
    titleUz: string;
    summaryUz: string;
    goldImpactUz?: string;
    at: string;
  };
}

/** Bepul: RSS sarlavha/summary aslida (AI tarjima yo'q) */
export function buildFreeTranslationCache(items: NewsItem[]): TranslationCache {
  const cache: TranslationCache = {};
  const at = new Date().toISOString();
  for (const item of items) {
    cache[item.id] = {
      titleUz: item.titleUz ?? item.title,
      summaryUz: item.summaryUz ?? item.summary,
      goldImpactUz: item.goldImpactUz,
      at,
    };
  }
  return cache;
}

export function mergeTranslationCache(
  existing: TranslationCache,
  items: NewsItem[]
): TranslationCache {
  const free = buildFreeTranslationCache(items);
  return { ...free, ...existing };
}

export function applyTranslations(
  items: NewsItem[],
  cache: TranslationCache
): NewsItem[] {
  return items.map((item) => {
    const t = cache[item.id];
    if (!t) return item;
    return {
      ...item,
      titleUz: t.titleUz,
      summaryUz: t.summaryUz,
      goldImpactUz: t.goldImpactUz ?? item.goldImpactUz,
    };
  });
}

export function applyNewsTranslations(
  news: GoldNewsBundle,
  cache: TranslationCache
): GoldNewsBundle {
  return {
    direct: applyTranslations(news.direct, cache),
    macro: applyTranslations(news.macro, cache),
    geopolitics: applyTranslations(news.geopolitics, cache),
  };
}
