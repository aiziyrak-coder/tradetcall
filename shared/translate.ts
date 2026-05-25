import type { GoldNewsBundle, NewsItem } from "./types";
import { isLikelyEnglish, translateBatchEnToUz } from "./free-translate";

export interface TranslationCache {
  [articleId: string]: {
    titleUz: string;
    summaryUz: string;
    goldImpactUz?: string;
    at: string;
  };
}

function cacheEntryValid(entry: { titleUz: string } | undefined, item: NewsItem): boolean {
  if (!entry?.titleUz) return false;
  if (entry.titleUz === item.title && isLikelyEnglish(item.title)) return false;
  return !isLikelyEnglish(entry.titleUz);
}

/** Mavjud to'g'ri tarjimalarni saqlash — inglizni titleUz qilib yozmaydi */
export function mergeTranslationCache(
  existing: TranslationCache,
  items: NewsItem[]
): TranslationCache {
  const merged = { ...existing };
  for (const item of items) {
    const cur = merged[item.id];
    if (cacheEntryValid(cur, item)) continue;
    if (cur && !cacheEntryValid(cur, item)) delete merged[item.id];
  }
  return merged;
}

export function applyTranslations(
  items: NewsItem[],
  cache: TranslationCache
): NewsItem[] {
  return items.map((item) => {
    const t = cache[item.id];
    if (!cacheEntryValid(t, item)) return item;
    return {
      ...item,
      titleUz: t!.titleUz,
      summaryUz: t!.summaryUz,
      goldImpactUz: t!.goldImpactUz ?? item.goldImpactUz,
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

/** Tarjima qilinmagan yangiliklar */
export function itemsNeedingTranslation(
  items: NewsItem[],
  cache: TranslationCache
): NewsItem[] {
  return items.filter((item) => !cacheEntryValid(cache[item.id], item));
}

/** Bepul onlayn tarjima — har safar cheklangan batch */
export async function translateNewsBatch(
  items: NewsItem[],
  cache: TranslationCache,
  maxItems = 10
): Promise<TranslationCache> {
  const pending = itemsNeedingTranslation(items, cache).slice(0, maxItems);
  if (pending.length === 0) return cache;

  const titles = pending.map((i) => i.title);
  const summaries = pending.map((i) => i.summary.slice(0, 200));

  const titleUzList = await translateBatchEnToUz(titles, 320);
  const summaryUzList = await translateBatchEnToUz(summaries, 320);

  const at = new Date().toISOString();
  const next = { ...cache };
  for (let i = 0; i < pending.length; i++) {
    const item = pending[i]!;
    const titleUz = titleUzList[i] ?? item.title;
    const summaryUz = summaryUzList[i] ?? item.summary;
    if (!cacheEntryValid({ titleUz }, item)) continue;
    next[item.id] = {
      titleUz,
      summaryUz,
      goldImpactUz: item.goldImpactUz,
      at,
    };
  }
  return next;
}
