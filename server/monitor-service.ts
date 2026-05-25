import { clearEnvApiKeys, setApiKey, askClaude } from "../shared/anthropic";
import { emitMonitorEvent } from "./events";
import type { ChartInterval } from "../shared/chart";
import { fetchXAUUSDCandles, patchLastCandle } from "../shared/chart";
import { fetchGoldNews, allGoldNewsItems } from "../shared/feeds";
import { getGoldDrivers } from "../shared/markets";
import { getXAUUSDPrice } from "../shared/price";
import { extractJSON } from "../shared/parse-json";
import { computeNewsIntelligence } from "../shared/news-intelligence";
import {
  SYSTEM_ANALYST,
  SYSTEM_NEWS_ANALYST,
  buildForecastPrompt,
  buildNewsDeepAnalysisPrompt,
} from "../shared/prompts";
import { computeLongTermStrategy } from "../shared/strategy";
import { analyzeTechnicals } from "../shared/technical";
import {
  computeShortTermStrategy,
  SHORT_STRATEGY_INTERVALS,
} from "../shared/short-strategy";
import {
  applyNewsTranslations,
  translateNewsBatch,
} from "../shared/translate";
import type {
  GoldNewsBundle,
  LongTermForecast,
  MonitorSnapshot,
  NewsMarketAnalysis,
} from "../shared/types";
import { checkInternet } from "./network";
import {
  getApiKey,
  getTranslationCache,
  setTranslationCache,
} from "./store";

const FAST_TICK_MS = 2000;
const CHART_TICK_MS = 12000;
const DRIVERS_TICK_MS = 20000;
const NEWS_TICK_MS = 120000;
const NEWS_ANALYSIS_MS = 15000;
const NEWS_AI_MS = 60000;
const TRANSLATE_TICK_MS = 45000;
const PRICE_STALE_MS = 15_000;
const MAX_PRICE_FAILS = 5;

let fastInterval: ReturnType<typeof setInterval> | null = null;
let chartIntervalTimer: ReturnType<typeof setInterval> | null = null;
let driversInterval: ReturnType<typeof setInterval> | null = null;
let newsInterval: ReturnType<typeof setInterval> | null = null;
let newsAnalysisInterval: ReturnType<typeof setInterval> | null = null;
let newsAiInterval: ReturnType<typeof setInterval> | null = null;
let translateInterval: ReturnType<typeof setInterval> | null = null;

let fastBusy = false;
let chartBusy = false;
let driversBusy = false;
let translating = false;
let priceFailCount = 0;
let lastPriceOkAt = 0;
let lastSnapshot: MonitorSnapshot | null = null;
let rawNews: GoldNewsBundle = { direct: [], macro: [], geopolitics: [] };
let lastNewsAnalysis: NewsMarketAnalysis | null = null;
let analyzingNews = false;
let chartInterval: ChartInterval = "5m";
let multiTfCandles: Partial<Record<ChartInterval, import("../shared/types").Candle[]>> =
  {};
let multiTfFetchedAt = 0;
const MULTI_TF_REFRESH_MS = 12_000;

async function refreshMultiTimeframes(spot: number): Promise<void> {
  if (
    Date.now() - multiTfFetchedAt < MULTI_TF_REFRESH_MS &&
    SHORT_STRATEGY_INTERVALS.every((tf) => (multiTfCandles[tf]?.length ?? 0) > 5)
  ) {
    for (const tf of SHORT_STRATEGY_INTERVALS) {
      const c = multiTfCandles[tf];
      if (c?.length) multiTfCandles[tf] = patchLastCandle(c, spot);
    }
    return;
  }
  const pairs = await Promise.all(
    SHORT_STRATEGY_INTERVALS.map(async (tf) => {
      const candles = await fetchXAUUSDCandles(tf, spot);
      return [tf, candles] as const;
    })
  );
  for (const [tf, candles] of pairs) {
    if (candles.length > 0) multiTfCandles[tf] = patchLastCandle(candles, spot);
  }
  multiTfFetchedAt = Date.now();
}

function emptySnapshot(partial?: Partial<MonitorSnapshot>): MonitorSnapshot {
  return {
    timestamp: new Date().toISOString(),
    online: false,
    priceStale: true,
    feedError: null,
    gold: null,
    drivers: [],
    news: newsWithCache(),
    chart: { interval: chartInterval, candles: [] },
    newsAnalysis: null,
    strategy: null,
    shortStrategy: null,
    translating: false,
    analyzingNews: false,
    ...partial,
  };
}

export function setChartInterval(interval: ChartInterval) {
  chartInterval = interval;
  void refreshChart();
}

export async function getChartData() {
  const gold = lastSnapshot?.gold ?? (await getXAUUSDPrice().catch(() => null));
  const candles = await fetchXAUUSDCandles(chartInterval, gold?.price);
  return { interval: chartInterval, candles };
}

function broadcast(channel: string, data: unknown) {
  emitMonitorEvent(channel, data);
}

function newsWithCache(): GoldNewsBundle {
  const cache = getTranslationCache();
  return applyNewsTranslations(rawNews, cache);
}

function ensureApiKey() {
  const key = getApiKey();
  if (key) {
    clearEnvApiKeys();
    setApiKey(key);
  }
}

function isPriceStale(): boolean {
  if (!lastPriceOkAt) return true;
  return Date.now() - lastPriceOkAt > PRICE_STALE_MS;
}

function publishSnapshot(partial?: Partial<MonitorSnapshot>) {
  if (!lastSnapshot) return;
  lastSnapshot = {
    ...lastSnapshot,
    ...partial,
    timestamp: new Date().toISOString(),
    priceStale: isPriceStale(),
    translating,
    analyzingNews,
  };
  broadcast("monitor:update", lastSnapshot);
}

function getTranslatedNews(): ReturnType<typeof allGoldNewsItems> {
  return allGoldNewsItems(newsWithCache());
}

function refreshNewsAnalysisLocal(): NewsMarketAnalysis | null {
  const gold = lastSnapshot?.gold;
  if (!gold) return null;
  const candles = lastSnapshot?.chart?.candles ?? [];
  const items = getTranslatedNews();
  lastNewsAnalysis = computeNewsIntelligence(
    items,
    gold.price,
    candles,
    lastSnapshot?.drivers ?? [],
    multiTfCandles
  );
  return lastNewsAnalysis;
}

function buildStrategies(
  gold: { price: number },
  candles: import("../shared/types").Candle[],
  drivers: import("../shared/types").MarketQuote[],
  newsItems: ReturnType<typeof getTranslatedNews>
) {
  const na = lastNewsAnalysis;
  return {
    strategy: computeLongTermStrategy(gold.price, candles, drivers, newsItems, na),
    shortStrategy: computeShortTermStrategy(
      gold.price,
      multiTfCandles,
      drivers,
      newsItems,
      na
    ),
    newsAnalysis: na,
  };
}

function markPriceOk() {
  priceFailCount = 0;
  lastPriceOkAt = Date.now();
}

function markPriceFail(message: string) {
  priceFailCount += 1;
  if (lastSnapshot) {
    lastSnapshot = {
      ...lastSnapshot,
      timestamp: new Date().toISOString(),
      priceStale: true,
      feedError: priceFailCount >= MAX_PRICE_FAILS ? message : lastSnapshot.feedError,
      online: priceFailCount < MAX_PRICE_FAILS ? lastSnapshot.online : false,
    };
    broadcast("monitor:update", lastSnapshot);
  }
}

async function refreshFastLive() {
  if (fastBusy) return;
  fastBusy = true;
  try {
    const online = await checkInternet();
    if (!online) {
      publishSnapshot({ online: false, feedError: "Internet yo'q" });
      return;
    }

    ensureApiKey();
    const gold = await getXAUUSDPrice().catch((e) => {
      markPriceFail(e instanceof Error ? e.message : "Narx xatosi");
      return null;
    });
    if (!gold) return;

    markPriceOk();

    const baseCandles = lastSnapshot?.chart?.candles ?? [];
    const candles =
      baseCandles.length > 0
        ? patchLastCandle(baseCandles, gold.price)
        : await fetchXAUUSDCandles(chartInterval, gold.price);

    const allNews = getTranslatedNews();
    refreshNewsAnalysisLocal();
    await refreshMultiTimeframes(gold.price);
    const { strategy, shortStrategy, newsAnalysis } = buildStrategies(
      gold,
      candles,
      lastSnapshot?.drivers ?? [],
      allNews
    );

    const patch: MonitorSnapshot = {
      ...(lastSnapshot ?? emptySnapshot()),
      online: true,
      priceStale: false,
      feedError: null,
      gold,
      chart: { interval: chartInterval, candles },
      newsAnalysis,
      strategy,
      shortStrategy,
      timestamp: new Date().toISOString(),
      translating,
    };
    lastSnapshot = patch;
    broadcast("monitor:update", lastSnapshot);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Xato";
    broadcast("monitor:error", { message: msg });
    markPriceFail(msg);
  } finally {
    fastBusy = false;
  }
}

async function refreshChart() {
  if (chartBusy) return;
  chartBusy = true;
  try {
    if (!(await checkInternet())) return;
    const gold = lastSnapshot?.gold ?? (await getXAUUSDPrice().catch(() => null));
    const candles = await fetchXAUUSDCandles(chartInterval, gold?.price);
    if (candles.length === 0) return;
    const patched =
      gold && candles.length > 0
        ? patchLastCandle(candles, gold.price)
        : candles;
    publishSnapshot({
      chart: { interval: chartInterval, candles: patched },
      online: true,
      feedError: null,
    });
  } finally {
    chartBusy = false;
  }
}

async function refreshDrivers() {
  if (driversBusy) return;
  driversBusy = true;
  try {
    if (!(await checkInternet())) return;
    const drivers = await getGoldDrivers(lastSnapshot?.gold ?? null);
    publishSnapshot({ drivers, online: true });
  } finally {
    driversBusy = false;
  }
}

async function refreshNews() {
  try {
    if (!(await checkInternet())) return;
    rawNews = await fetchGoldNews();
    refreshNewsAnalysisLocal();
    const gold = lastSnapshot?.gold;
    if (gold && lastSnapshot) {
      const allNews = getTranslatedNews();
      const { strategy, shortStrategy, newsAnalysis } = buildStrategies(
        gold,
        lastSnapshot.chart.candles,
        lastSnapshot.drivers,
        allNews
      );
      publishSnapshot({
        news: newsWithCache(),
        newsAnalysis,
        strategy,
        shortStrategy,
        online: true,
        feedError: null,
      });
    } else {
      publishSnapshot({ news: newsWithCache(), online: true, feedError: null });
    }
    void refreshNewsDeepAnalysis();
  } catch (e) {
    broadcast("monitor:error", {
      message: e instanceof Error ? e.message : "Yangiliklar xatosi",
    });
  }
}

async function refreshTranslations() {
  const key = getApiKey();
  if (!key || translating) return;

  clearEnvApiKeys();
  setApiKey(key);
  translating = true;
  broadcast("monitor:translating", true);

  try {
    let cache = getTranslationCache();
    const items = allGoldNewsItems(rawNews);
    if (items.length === 0) return;
    cache = await translateNewsBatch(items, cache, 18);
    setTranslationCache(cache);
    const translated = applyNewsTranslations(rawNews, cache);
    publishSnapshot({ news: translated });
    refreshNewsAnalysisLocal();
    if (lastSnapshot?.gold) {
      const { strategy, shortStrategy, newsAnalysis } = buildStrategies(
        lastSnapshot.gold,
        lastSnapshot.chart.candles,
        lastSnapshot.drivers,
        getTranslatedNews()
      );
      publishSnapshot({ newsAnalysis, strategy, shortStrategy });
    }
  } catch {
    /* tarjima ixtiyoriy */
  } finally {
    translating = false;
    broadcast("monitor:translating", false);
  }
}

async function bootstrapSnapshot(): Promise<void> {
  const online = await checkInternet();
  if (!online) {
    lastSnapshot = emptySnapshot({ feedError: "Internet yo'q" });
    broadcast("monitor:update", lastSnapshot);
    return;
  }

  ensureApiKey();
  try {
    const gold = await getXAUUSDPrice().catch((e) => {
      throw e;
    });
    markPriceOk();

    const [candles, news, drivers] = await Promise.all([
      fetchXAUUSDCandles(chartInterval, gold.price),
      fetchGoldNews(),
      getGoldDrivers(gold),
    ]);
    rawNews = news;
    const patched =
      candles.length > 0 ? patchLastCandle(candles, gold.price) : candles;
    const allNews = allGoldNewsItems(news);
    lastNewsAnalysis = computeNewsIntelligence(
      allNews,
      gold.price,
      patched,
      drivers,
      multiTfCandles
    );
    await refreshMultiTimeframes(gold.price);
    const { strategy, shortStrategy, newsAnalysis } = buildStrategies(
      gold,
      patched,
      drivers,
      allNews
    );

    lastSnapshot = {
      timestamp: new Date().toISOString(),
      online: true,
      priceStale: false,
      feedError: null,
      gold,
      drivers,
      news: newsWithCache(),
      newsAnalysis,
      chart: { interval: chartInterval, candles: patched },
      strategy,
      shortStrategy,
      translating: false,
      analyzingNews: false,
    };
    broadcast("monitor:update", lastSnapshot);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Boshlang‘ich yuklash xatosi";
    lastSnapshot = emptySnapshot({ feedError: msg });
    broadcast("monitor:update", lastSnapshot);
    broadcast("monitor:error", { message: msg });
  }
}

function startIntervals() {
  fastInterval = setInterval(refreshFastLive, FAST_TICK_MS);
  chartIntervalTimer = setInterval(refreshChart, CHART_TICK_MS);
  driversInterval = setInterval(refreshDrivers, DRIVERS_TICK_MS);
  newsInterval = setInterval(refreshNews, NEWS_TICK_MS);
  newsAnalysisInterval = setInterval(() => {
    if (!lastSnapshot?.gold) return;
    refreshNewsAnalysisLocal();
    const gold = lastSnapshot.gold;
    const { strategy, shortStrategy, newsAnalysis } = buildStrategies(
      gold,
      lastSnapshot.chart.candles,
      lastSnapshot.drivers,
      getTranslatedNews()
    );
    publishSnapshot({ newsAnalysis, strategy, shortStrategy });
  }, NEWS_ANALYSIS_MS);
  newsAiInterval = setInterval(() => void refreshNewsDeepAnalysis(), NEWS_AI_MS);
  translateInterval = setInterval(refreshTranslations, TRANSLATE_TICK_MS);
}

export function startMonitorService(): void {
  if (fastInterval) return;
  void bootstrapSnapshot().then(() => {
    startIntervals();
    void refreshTranslations();
    void refreshNewsDeepAnalysis();
  });
}

export async function refreshNewsDeepAnalysis(): Promise<NewsMarketAnalysis | null> {
  const key = getApiKey();
  if (!key || analyzingNews) return lastNewsAnalysis;

  const gold = lastSnapshot?.gold ?? (await getXAUUSDPrice().catch(() => null));
  if (!gold) return null;

  const base = refreshNewsAnalysisLocal();
  if (!base) return null;

  analyzingNews = true;
  broadcast("monitor:analyzingNews", true);
  publishSnapshot({ analyzingNews: true });

  try {
    clearEnvApiKeys();
    setApiKey(key);
    const candles = lastSnapshot?.chart?.candles ?? [];
    const tech = analyzeTechnicals(
      candles.length ? candles : [{ time: 0, open: gold.price, high: gold.price, low: gold.price, close: gold.price }]
    );
    const items = getTranslatedNews();
    const prompt = buildNewsDeepAnalysisPrompt(
      gold.price,
      gold.changePercent,
      tech,
      base,
      items.map((n) => ({
        title: n.titleUz ?? n.title,
        summary: n.summaryUz ?? n.summary,
        stream: n.stream,
      }))
    );
    const text = await askClaude(SYSTEM_NEWS_ANALYST, prompt, 6000);
    const ai = extractJSON<{
      aiDiscussionUz: string;
      aiFutureOutlookUz: string;
      overallBias?: NewsMarketAnalysis["overallBias"];
      biasStrength?: number;
      trendOutlookUz?: string;
      recommendationUz?: string;
      tradeVerdictUz?: string;
      contradictionsUz?: string | null;
      keyRisks?: string[];
      keyOpportunities?: string[];
    }>(text);

    lastNewsAnalysis = {
      ...base,
      aiDiscussionUz: ai.aiDiscussionUz,
      aiFutureOutlookUz: ai.aiFutureOutlookUz,
      overallBias: ai.overallBias ?? base.overallBias,
      biasStrength: ai.biasStrength ?? base.biasStrength,
      trendOutlookUz: ai.trendOutlookUz ?? base.trendOutlookUz,
      recommendationUz: ai.recommendationUz ?? base.recommendationUz,
      tradeVerdictUz: ai.tradeVerdictUz ?? base.tradeVerdictUz,
      forecastUz: (ai.aiFutureOutlookUz ?? base.forecastUz)?.slice(0, 220),
      contradictionsUz: ai.contradictionsUz ?? base.contradictionsUz,
      narrativeUz: base.narrativeUz + " " + (ai.aiDiscussionUz?.slice(0, 200) ?? ""),
      risksUz: [...base.risksUz, ...(ai.keyRisks ?? [])].slice(0, 8),
      opportunitiesUz: [...base.opportunitiesUz, ...(ai.keyOpportunities ?? [])].slice(0, 8),
    };

    if (lastSnapshot?.gold) {
      const { strategy, shortStrategy, newsAnalysis } = buildStrategies(
        lastSnapshot.gold,
        lastSnapshot.chart.candles,
        lastSnapshot.drivers,
        getTranslatedNews()
      );
      publishSnapshot({ newsAnalysis, strategy, shortStrategy });
    }
    return lastNewsAnalysis;
  } catch {
    return lastNewsAnalysis;
  } finally {
    analyzingNews = false;
    broadcast("monitor:analyzingNews", false);
    publishSnapshot({ analyzingNews: false });
  }
}

export function runNewsDeepAnalysis(): Promise<NewsMarketAnalysis | null> {
  return refreshNewsDeepAnalysis();
}

export function stopMonitorService(): void {
  if (fastInterval) clearInterval(fastInterval);
  if (chartIntervalTimer) clearInterval(chartIntervalTimer);
  if (driversInterval) clearInterval(driversInterval);
  if (newsInterval) clearInterval(newsInterval);
  if (newsAnalysisInterval) clearInterval(newsAnalysisInterval);
  if (newsAiInterval) clearInterval(newsAiInterval);
  if (translateInterval) clearInterval(translateInterval);
  fastInterval = null;
  chartIntervalTimer = null;
  driversInterval = null;
  newsInterval = null;
  newsAnalysisInterval = null;
  newsAiInterval = null;
  translateInterval = null;
  fastBusy = false;
  chartBusy = false;
  driversBusy = false;
  translating = false;
}

export function restartMonitorService(): void {
  stopMonitorService();
  priceFailCount = 0;
  lastPriceOkAt = 0;
  startMonitorService();
}

export function getLastSnapshot(): MonitorSnapshot | null {
  return lastSnapshot;
}

export async function buildSnapshot(): Promise<MonitorSnapshot> {
  if (lastSnapshot) return lastSnapshot;
  await bootstrapSnapshot();
  return lastSnapshot ?? emptySnapshot();
}

export async function runForecast(): Promise<LongTermForecast> {
  const key = getApiKey();
  if (!key) throw new Error("API kalit kiritilmagan");
  clearEnvApiKeys();
  setApiKey(key);

  const gold = await getXAUUSDPrice();
  const candles = await fetchXAUUSDCandles(chartInterval, gold.price);
  const items = allGoldNewsItems(rawNews).slice(0, 12);
  if (!lastNewsAnalysis) refreshNewsAnalysisLocal();
  const base = computeLongTermStrategy(
    gold.price,
    candles,
    lastSnapshot?.drivers ?? [],
    items,
    lastNewsAnalysis
  );

  const newsBrief = lastNewsAnalysis
    ? `${lastNewsAnalysis.narrativeUz}\n${lastNewsAnalysis.aiDiscussionUz ?? ""}\n${lastNewsAnalysis.recommendationUz}`
    : undefined;

  const prompt = buildForecastPrompt(
    gold.price,
    gold.change,
    gold.changePercent,
    gold.high24h,
    gold.low24h,
    base.technical,
    base,
    items.map((n) => ({
      title: n.titleUz ?? n.title,
      summary: n.summaryUz ?? n.summary,
    })),
    newsBrief
  );
  const text = await askClaude(SYSTEM_ANALYST, prompt, 4096);
  return extractJSON<LongTermForecast>(text);
}
