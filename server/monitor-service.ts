import { emitMonitorEvent } from "./events";
import type { ChartInterval } from "../shared/chart";
import { fetchXAUUSDCandles, patchLastCandle } from "../shared/chart";
import { fetchGoldNews, allGoldNewsItems } from "../shared/feeds";
import { getGoldDrivers } from "../shared/markets";
import { getXAUUSDPrice } from "../shared/price";
import { getCalendarStatus } from "../shared/economic-calendar";
import { pullLiveGoldPrice, peekCachedGoldPrice } from "./price-stream";
import {
  createSignalStabilityState,
  stabilizeTradeAction,
  type SignalStabilityState,
} from "../shared/signal-stability";
import type { LongTermStrategy, ShortTermStrategy } from "../shared/types";
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
  translateNewsBatch,
} from "../shared/translate";
import type {
  GoldNewsBundle,
  LongTermForecast,
  MonitorSnapshot,
  NewsMarketAnalysis,
} from "../shared/types";
import { checkInternet } from "./network";
import { enrichSnapshotWithPlatform } from "./platform-service";
import { getTranslationCache, setTranslationCache } from "./store";

const PRICE_FAST_MS = 400;
const PRICE_FETCH_MS = 1000;
const STRATEGY_TICK_MS = 3500;
const CHART_TICK_MS = 2000;
const HEARTBEAT_MS = 1500;
const INTERNET_CHECK_MS = 25_000;

const VALID_CHART_INTERVALS: ChartInterval[] = ["1m", "5m", "15m", "1h"];
const DRIVERS_TICK_MS = 20000;
const NEWS_TICK_MS = 120000;
const NEWS_ANALYSIS_MS = 20000;
const TRANSLATE_TICK_MS = 12_000;
const TRANSLATE_BATCH = 8;
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
let translateInterval: ReturnType<typeof setInterval> | null = null;

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
const MULTI_TF_REFRESH_MS = 8000;
let lastStrategyRebuildAt = 0;
let bootstrapPromise: Promise<void> | null = null;
let shortStability = createSignalStabilityState();
let longStability = createSignalStabilityState();
let frozenShort: ShortTermStrategy | null = null;
let frozenLong: LongTermStrategy | null = null;
let lastStrategyPrice = 0;
let priceFetchInFlight = false;
let lastPriceFetchAt = 0;

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

function pruneTranslationCache(): void {
  const items = allGoldNewsItems(rawNews);
  const cache = mergeTranslationCache(getTranslationCache(), items);
  setTranslationCache(cache);
}

async function runNewsTranslation(): Promise<void> {
  if (translating) return;
  const items = allGoldNewsItems(rawNews);
  if (items.length === 0) return;
  translating = true;
  publishSnapshot({ translating: true });
  try {
    if (!(await checkInternet())) return;
    const merged = mergeTranslationCache(getTranslationCache(), items);
    const updated = await translateNewsBatch(items, merged, TRANSLATE_BATCH);
    setTranslationCache(updated);
    publishSnapshot({ news: newsWithCache(), translating: false });
    if (lastSnapshot?.gold) {
      const allNews = getTranslatedNews();
      const gold = lastSnapshot.gold;
      const candles = lastSnapshot.chart?.candles ?? [];
      const drivers = lastSnapshot.drivers ?? [];
      const built = buildStrategies(gold, candles, drivers, allNews);
      publishSnapshot({
        newsAnalysis: built.newsAnalysis,
        strategy: built.strategy,
        shortStrategy: built.shortStrategy,
        translating: false,
      });
    }
  } catch {
    publishSnapshot({ translating: false });
  } finally {
    translating = false;
  }
}

function isPriceStale(): boolean {
  const mt5 = getMt5BridgeStatus();
  if (mt5.connected && !mt5.stale) return false;
  if (!lastPriceOkAt) return true;
  return Date.now() - lastPriceOkAt > PRICE_STALE_MS;
}

function mergeSnapshot(partial: Partial<MonitorSnapshot>): MonitorSnapshot {
  const base = lastSnapshot ?? emptySnapshot();
  const merged: MonitorSnapshot = {
    ...base,
    ...partial,
    timestamp: new Date().toISOString(),
    priceStale: isPriceStale(),
    translating,
    analyzingNews,
    mt5Bridge: partial.mt5Bridge ?? getMt5BridgeStatus(),
    calendar: partial.calendar ?? getCalendarStatus(),
  };
  lastSnapshot = enrichSnapshotWithPlatform(merged);
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

function mergeStableVerdict<T extends LongTermStrategy | ShortTermStrategy>(
  raw: T,
  horizon: "long" | "short",
  stability: SignalStabilityState,
  frozen: T | null
): { strategy: T; stability: SignalStabilityState; frozen: T | null } {
  const rawAction = raw.verdict.action;
  const stab = stabilizeTradeAction(stability, rawAction, horizon);
  let nextFrozen = frozen;

  if (rawAction === stab.action) {
    nextFrozen = raw;
    return { strategy: raw, stability: stab.state, frozen: nextFrozen };
  }

  if (stab.action === "HOLD") {
    nextFrozen = null;
    return {
      strategy: {
        ...raw,
        verdict: {
          ...raw.verdict,
          action: "HOLD",
          reliabilityUz: stab.noteUz,
          signalUz: `HOLD — ${stab.noteUz}`,
          gateAllowed: false,
        },
      } as T,
      stability: stab.state,
      frozen: null,
    };
  }

  if (frozen && frozen.verdict.action === stab.action) {
    const merged = {
      ...frozen,
      signal: raw.signal,
      confidence: raw.confidence,
      situationUz: `${stab.noteUz}. ${raw.situationUz.slice(0, 120)}`,
      verdict: {
        ...frozen.verdict,
        action: stab.action,
        reliabilityUz: `${stab.noteUz}. ${frozen.verdict.reliabilityUz}`,
        entry: raw.verdict.entry,
        stopLoss: raw.verdict.stopLoss,
        takeProfit: raw.verdict.takeProfit,
        riskReward: raw.verdict.riskReward,
        inEntryZone: raw.verdict.inEntryZone,
        strength: raw.verdict.strength,
        signalUz: raw.verdict.signalUz.replace(/^(BUY|SELL|HOLD)/, stab.action),
      },
    } as T;
    return { strategy: merged, stability: stab.state, frozen: merged };
  }

  nextFrozen = raw;
  return { strategy: raw, stability: stab.state, frozen: nextFrozen };
}

function buildStrategies(
  gold: { price: number },
  candles: import("../shared/types").Candle[],
  drivers: import("../shared/types").MarketQuote[],
  newsItems: ReturnType<typeof getTranslatedNews>
) {
  const na = lastNewsAnalysis;
  const rawLong = computeLongTermStrategy(gold.price, candles, drivers, newsItems, na);
  const rawShort = computeShortTermStrategy(
    gold.price,
    multiTfCandles,
    drivers,
    newsItems,
    na
  );

  const longR = mergeStableVerdict(rawLong, "long", longStability, frozenLong);
  longStability = longR.stability;
  frozenLong = longR.frozen;

  const shortR = mergeStableVerdict(rawShort, "short", shortStability, frozenShort);
  shortStability = shortR.stability;
  frozenShort = shortR.frozen;

  return {
    strategy: longR.strategy,
    shortStrategy: shortR.strategy,
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

function patchAllCandles(price: number): import("../shared/types").Candle[] {
  const baseCandles = lastSnapshot?.chart?.candles ?? [];
  let candles = baseCandles;
  if (baseCandles.length > 0) {
    candles = patchLastCandle(baseCandles, price);
    for (const tf of SHORT_STRATEGY_INTERVALS) {
      const c = multiTfCandles[tf];
      if (c?.length) multiTfCandles[tf] = patchLastCandle(c, price);
    }
  }
  return candles;
}

async function fetchAndPublishPrice() {
  if (priceFetchInFlight) return;
  priceFetchInFlight = true;
  try {
    if (!(await ensureOnline())) {
      publishSnapshot({ online: false, feedError: "Internet yo'q" });
      return;
    }

    const gold = await pullLiveGoldPrice(lastSnapshot?.gold ?? null).catch((e) => {
      markPriceFail(e instanceof Error ? e.message : "Narx xatosi");
      return null;
    });
    if (!gold) return;

    markPriceOk();
    lastPriceFetchAt = Date.now();
    tickSeq += 1;

    let candles = patchAllCandles(gold.price);
    if (!candles.length) {
      candles = await fetchXAUUSDCandles(chartInterval, gold.price);
    }

    const priceMoved = Math.abs(gold.price - lastStrategyPrice) >= 0.15;
    lastStrategyPrice = gold.price;

    mergeSnapshot({
      online: true,
      priceStale: false,
      feedError: null,
      gold,
      chart: { interval: chartInterval, candles },
      tickSeq,
      priceUpdatedAt: gold.timestamp,
      mt5Bridge: getMt5BridgeStatus(),
    });
    broadcast("monitor:update", lastSnapshot);

    if (priceMoved) void refreshStrategyLive();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Xato";
    broadcast("monitor:error", { message: msg });
    markPriceFail(msg);
  } finally {
    priceFetchInFlight = false;
  }
}

/** Har 400ms — narx + sham (Yahoo ~1s, MT5 har tick) */
function refreshPriceFast() {
  if (priceBusy) return;
  priceBusy = true;
  try {
    const now = Date.now();
    const needFetch = now - lastPriceFetchAt >= PRICE_FETCH_MS;

    if (needFetch) {
      void fetchAndPublishPrice();
      return;
    }

    const gold = peekCachedGoldPrice();
    if (!gold || !lastSnapshot?.gold) {
      void fetchAndPublishPrice();
      return;
    }

    tickSeq += 1;
    const candles = patchAllCandles(gold.price);

    mergeSnapshot({
      gold,
      chart: { interval: chartInterval, candles },
      tickSeq,
      priceUpdatedAt: gold.timestamp,
      online: true,
      priceStale: false,
      mt5Bridge: getMt5BridgeStatus(),
    });
    broadcast("monitor:update", lastSnapshot);
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
      signalUpdatedAt: new Date().toISOString(),
    });
  } catch {
    /* strategiya keyingi tsiklda */
  } finally {
    strategyBusy = false;
  }
}

/** @deprecated alias */
async function refreshFastLive() {
  await fetchAndPublishPrice();
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
    pruneTranslationCache();
    void runNewsTranslation();
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
    pruneTranslationCache();
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
    void runNewsTranslation();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Boshlang‘ich yuklash xatosi";
    lastSnapshot = emptySnapshot({ feedError: msg });
    broadcast("monitor:update", lastSnapshot);
    broadcast("monitor:error", { message: msg });
  }
}

function startIntervals() {
  priceInterval = setInterval(refreshPriceFast, PRICE_FAST_MS);
  strategyInterval = setInterval(() => void refreshStrategyLive(), STRATEGY_TICK_MS);
  fastInterval = priceInterval;
  void fetchAndPublishPrice();
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
      signalUpdatedAt: new Date().toISOString(),
    });
  }, NEWS_ANALYSIS_MS);
  translateInterval = setInterval(() => void runNewsTranslation(), TRANSLATE_TICK_MS);
  void runNewsTranslation();
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

/** Yangiliklar tahlili — lokal hisob */
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
  if (translateInterval) clearInterval(translateInterval);
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
  translateInterval = null;
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

/** Strategiya — verdict bashorat beradi */
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
