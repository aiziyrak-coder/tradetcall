import { askClaude } from "./anthropic";
import { extractJSON } from "./parse-json";
import { SYSTEM_TRANSLATOR, buildTranslatePrompt } from "./prompts";
import type { GoldNewsBundle, NewsItem } from "./types";

export interface TranslationCache {
  [articleId: string]: {
    titleUz: string;
    summaryUz: string;
    goldImpactUz?: string;
    at: string;
  };
}

interface TranslatedRow {
  id: string;
  titleUz: string;
  summaryUz: string;
  goldImpactUz?: string;
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

export async function translateNewsBatch(
  items: NewsItem[],
  cache: TranslationCache,
  maxBatch = 14
): Promise<TranslationCache> {
  const need = items.filter((i) => !cache[i.id]).slice(0, maxBatch);
  if (need.length === 0) return cache;

  const prompt = buildTranslatePrompt(
    need.map((n) => ({ id: n.id, title: n.title, summary: n.summary }))
  );

  try {
    const text = await askClaude(SYSTEM_TRANSLATOR, prompt, 8000);
    const rows = extractJSON<TranslatedRow[]>(text);
    const next = { ...cache };
    rows.forEach((row, idx) => {
      const match = need.find((n) => n.id === row.id) ?? need[idx];
      if (!match) return;
      next[match.id] = {
        titleUz: row.titleUz || match.title,
        summaryUz: row.summaryUz || match.summary,
        goldImpactUz: row.goldImpactUz,
        at: new Date().toISOString(),
      };
    });
    for (const item of need) {
      if (!next[item.id]) {
        next[item.id] = {
          titleUz: item.title,
          summaryUz: item.summary,
          at: new Date().toISOString(),
        };
      }
    }
    return next;
  } catch {
    return cache;
  }
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
