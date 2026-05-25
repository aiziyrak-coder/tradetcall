import { emitMonitorEvent } from "./events";
import type { ChartInterval } from "../shared/chart";
import { fetchXAUUSDCandles, patchLastCandle } from "../shared/chart";
import { fetchGoldNews, allGoldNewsItems } from "../shared/feeds";
import { getGoldDrivers } from "../shared/markets";
import { getXAUUSDPrice } from "../shared/price";
import { getCalendarStatus } from "../shared/economic-calendar";
import { getBestGoldPrice } from "./price-feed";
import { getMt5BridgeStatus } from "./mt5-bridge";
import { startCalendarService, stopCalendarService } from "./calendar-service";
import { computeNewsIntelligence } from "../shared/news-intelligence";
import { computeLongTermStrategy } from "../shared/strategy";
import {
  computeShortTermStrategy,
  SHORT_STRATEGY_INTERVALS,
} from "../shared/short-strategy";
import {
  applyNewsTranslations,
  mergeTranslationCache,
} from "../shared/translate";
import type {
  GoldNewsBundle,
  LongTermForecast,
  MonitorSnapshot,
  NewsMarketAnalysis,
} from "../shared/types";
import { checkInternet } from "./network";
import { getTranslationCache, setTranslationCache } from "./store";

const PRICE_TICK_MS = 800;
const STRATEGY_TICK_MS = 10_000;
const CHART_TICK_MS = 3000;
const HEARTBEAT_MS = 2000;
const INTERNET_CHECK_MS = 25_000;

const VALID_CHART_INTERVALS: ChartInterval[] = ["1m", "5m", "15m", "1h"];
const DRIVERS_TICK_MS = 20000;
const NEWS_TICK_MS = 120000;
const NEWS_ANALYSIS_MS = 20000;
const PRICE_STALE_MS = 15_000;
const MAX_PRICE_FAILS = 5;

let priceInterval: ReturnType<typeof setInterval> | null = null;
let strategyInterval: ReturnType<typeof setInterval> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let fastInterval: ReturnType<typeof setInterval> | null = null;
let chartIntervalTimer: ReturnType<typeof setInterval> | null = null;
let driversInterval: ReturnType<typeof setInterval> | null = null;
let newsInterval: ReturnType<typeof setInterval> | null = null;
let newsAnalysisInterval: ReturnType<typeof setInterval> | null = null;

let priceBusy = false;
let strategyBusy = false;
let lastInternetOk = true;
let lastInternetCheckAt = 0;
let tickSeq = 0;
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
let lastStrategyRebuildAt = 0;
let bootstrapPromise: Promise<void> | null = null;

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
    mt5Bridge: getMt5BridgeStatus(),
    calendar: getCalendarStatus(),
    ...partial,
  };
}

export function setChartInterval(interval: ChartInterval) {
  if (!VALID_CHART_INTERVALS.includes(interval)) {
    throw new Error(`Noto'g'ri interval: ${interval}`);
  }
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

function syncFreeNewsCache(): void {
  const items = allGoldNewsItems(rawNews);
  const cache = mergeTranslationCache(getTranslationCache(), items);
  setTranslationCache(cache);
}

function isPriceStale(): boolean {
  const mt5 = getMt5BridgeStatus();
  if (mt5.connected && !mt5.stale) return false;
  if (!lastPriceOkAt) return true;
  return Date.now() - lastPriceOkAt > PRICE_STALE_MS;
}

function mergeSnapshot(partial: Partial<MonitorSnapshot>): MonitorSnapshot {
  const base = lastSnapshot ?? emptySnapshot();
  lastSnapshot = {
    ...base,
    ...partial,
    timestamp: new Date().toISOString(),
    priceStale: isPriceStale(),
    translating,
    analyzingNews,
    mt5Bridge: partial.mt5Bridge ?? getMt5BridgeStatus(),
    calendar: partial.calendar ?? getCalendarStatus(),
  };
  return lastSnapshot;
}

function publishSnapshot(partial?: Partial<MonitorSnapshot>) {
  if (!partial) return;
  mergeSnapshot(partial);
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
    mergeSnapshot({
      priceStale: true,
      feedError: priceFailCount >= MAX_PRICE_FAILS ? message : lastSnapshot?.feedError ?? message,
      online: priceFailCount < MAX_PRICE_FAILS ? (lastSnapshot?.online ?? false) : false,
    });
    broadcast("monitor:update", lastSnapshot);
}

async function ensureOnline(): Promise<boolean> {
  const now = Date.now();
  if (now - lastInternetCheckAt < INTERNET_CHECK_MS) return lastInternetOk;
  lastInternetOk = await checkInternet();
  lastInternetCheckAt = now;
  return lastInternetOk;
}

/** Har 0.5s — faqat narx, grafik, order flow (bloklanmaydi) */
async function refreshPriceLive() {
  if (priceBusy) return;
  priceBusy = true;
  try {
    if (!(await ensureOnline())) {
      publishSnapshot({ online: false, feedError: "Internet yo'q" });
      return;
    }

    const gold = await getBestGoldPrice(lastSnapshot?.gold ?? null).catch((e) => {
      markPriceFail(e instanceof Error ? e.message : "Narx xatosi");
      return null;
    });
    if (!gold) return;

    markPriceOk();
    tickSeq += 1;

    const baseCandles = lastSnapshot?.chart?.candles ?? [];
    let candles = baseCandles;
    if (baseCandles.length > 0) {
      candles = patchLastCandle(baseCandles, gold.price);
      const m5 = multiTfCandles["5m"];
      if (m5?.length) multiTfCandles["5m"] = patchLastCandle(m5, gold.price);
    } else {
      candles = await fetchXAUUSDCandles(chartInterval, gold.price);
    }

    mergeSnapshot({
      online: true,
      priceStale: false,
      feedError: null,
      gold,
      chart: { interval: chartInterval, candles },
      tickSeq,
    });
    broadcast("monitor:update", lastSnapshot);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Xato";
    broadcast("monitor:error", { message: msg });
    markPriceFail(msg);
  } finally {
    priceBusy = false;
  }
}

/** Alohida — og'ir TF/strategiya (narx oqimini to'xtatmaydi) */
async function refreshStrategyLive() {
  if (strategyBusy || !lastSnapshot?.gold) return;
  strategyBusy = true;
  try {
    const gold = lastSnapshot.gold;
    const candles = lastSnapshot.chart?.candles ?? [];
    if (!candles.length) return;

    refreshNewsAnalysisLocal();
    await refreshMultiTimeframes(gold.price);
    const built = buildStrategies(
      gold,
      patchLastCandle(candles, gold.price),
      lastSnapshot.drivers ?? [],
      getTranslatedNews()
    );
    lastStrategyRebuildAt = Date.now();
    publishSnapshot({
      newsAnalysis: built.newsAnalysis,
      strategy: built.strategy,
      shortStrategy: built.shortStrategy,
    });
  } catch {
    /* strategiya keyingi tsiklda */
  } finally {
    strategyBusy = false;
  }
}

/** @deprecated alias */
async function refreshFastLive() {
  await refreshPriceLive();
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
    syncFreeNewsCache();
    refreshNewsAnalysisLocal();
    const gold = lastSnapshot?.gold;
    if (gold && lastSnapshot) {
      const allNews = getTranslatedNews();
      const { strategy, shortStrategy, newsAnalysis } = buildStrategies(
        gold,
        lastSnapshot.chart?.candles ?? [],
        lastSnapshot.drivers ?? [],
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
  } catch (e) {
    broadcast("monitor:error", {
      message: e instanceof Error ? e.message : "Yangiliklar xatosi",
    });
  }
}

async function bootstrapSnapshot(): Promise<void> {
  const online = await checkInternet();
  if (!online) {
    lastSnapshot = emptySnapshot({ feedError: "Internet yo'q" });
    broadcast("monitor:update", lastSnapshot);
    return;
  }

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
    syncFreeNewsCache();
    const patched =
      candles.length > 0 ? patchLastCandle(candles, gold.price) : candles;
    const allNews = getTranslatedNews();
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

    mergeSnapshot({
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
    });
    lastStrategyRebuildAt = Date.now();
    broadcast("monitor:update", lastSnapshot);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Boshlang‘ich yuklash xatosi";
    lastSnapshot = emptySnapshot({ feedError: msg });
    broadcast("monitor:update", lastSnapshot);
    broadcast("monitor:error", { message: msg });
  }
}

function startIntervals() {
  priceInterval = setInterval(() => void refreshPriceLive(), PRICE_TICK_MS);
  strategyInterval = setInterval(() => void refreshStrategyLive(), STRATEGY_TICK_MS);
  fastInterval = priceInterval;
  chartIntervalTimer = setInterval(() => void refreshChart(), CHART_TICK_MS);
  heartbeatInterval = setInterval(() => {
    broadcast("monitor:ping", { t: Date.now() });
  }, HEARTBEAT_MS);
  driversInterval = setInterval(refreshDrivers, DRIVERS_TICK_MS);
  newsInterval = setInterval(refreshNews, NEWS_TICK_MS);
  newsAnalysisInterval = setInterval(() => {
    if (!lastSnapshot?.gold) return;
    const newsAnalysis = refreshNewsAnalysisLocal();
    if (!newsAnalysis) return;
    publishSnapshot({ newsAnalysis, analyzingNews: false });
    if (Date.now() - lastStrategyRebuildAt < STRATEGY_TICK_MS - 1500) return;
    const gold = lastSnapshot.gold;
    const candles = lastSnapshot.chart?.candles ?? [];
    const drivers = lastSnapshot.drivers ?? [];
    const built = buildStrategies(gold, candles, drivers, getTranslatedNews());
    lastStrategyRebuildAt = Date.now();
    publishSnapshot({
      newsAnalysis: built.newsAnalysis,
      strategy: built.strategy,
      shortStrategy: built.shortStrategy,
    });
  }, NEWS_ANALYSIS_MS);
}

export function startMonitorService(): void {
  if (fastInterval) return;
  startCalendarService();
  if (!lastSnapshot) lastSnapshot = emptySnapshot();
  const boot = bootstrapPromise ?? bootstrapSnapshot();
  bootstrapPromise = boot;
  void boot
    .then(() => {
      startIntervals();
      void refreshStrategyLive();
    })
    .finally(() => {
      bootstrapPromise = null;
    });
}

/** Bepul rejim — pullik AI o'chirilgan */
export async function refreshNewsDeepAnalysis(): Promise<NewsMarketAnalysis | null> {
  return refreshNewsAnalysisLocal();
}

export function runNewsDeepAnalysis(): Promise<NewsMarketAnalysis | null> {
  return Promise.resolve(refreshNewsAnalysisLocal());
}

export function stopMonitorService(): void {
  stopCalendarService();
  if (priceInterval) clearInterval(priceInterval);
  if (strategyInterval) clearInterval(strategyInterval);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (fastInterval) clearInterval(fastInterval);
  if (chartIntervalTimer) clearInterval(chartIntervalTimer);
  if (driversInterval) clearInterval(driversInterval);
  if (newsInterval) clearInterval(newsInterval);
  if (newsAnalysisInterval) clearInterval(newsAnalysisInterval);
  priceInterval = null;
  strategyInterval = null;
  heartbeatInterval = null;
  fastInterval = null;
  chartIntervalTimer = null;
  priceBusy = false;
  strategyBusy = false;
  driversInterval = null;
  newsInterval = null;
  newsAnalysisInterval = null;
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
  if (lastSnapshot?.gold) return lastSnapshot;
  if (bootstrapPromise) {
    await bootstrapPromise;
    return lastSnapshot ?? emptySnapshot();
  }
  await bootstrapSnapshot();
  return lastSnapshot ?? emptySnapshot();
}

/** Bepul rejim — strategiya verdict.allaqachon bashorat beradi */
export async function runForecast(): Promise<LongTermForecast> {
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
  const v = base.verdict;
  return {
    bias: base.bias,
    horizonUz: base.horizonUz,
    confidence: base.confidence,
    situationUz: v.analysisUz,
    entry: base.entry,
    exit: base.exit,
    stopLoss: base.stopLoss,
    takeProfit: base.takeProfit,
    invalidationUz: base.invalidationUz,
    weekPlanUz: v.forecastUz,
    keyFactors: base.tacticsUz.slice(0, 5),
    riskWarning: v.reliabilityUz,
    summaryUz: `${v.action} — ${v.reliabilityUz}`,
  };
}
