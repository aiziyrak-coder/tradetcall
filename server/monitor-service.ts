import { emitMonitorEvent } from "./events";
import type { ChartInterval } from "../shared/chart";
import { fetchXAUUSDCandles, patchLastCandle } from "../shared/chart";
import { fetchGoldNews, allGoldNewsItems } from "../shared/feeds";
import { getGoldDrivers } from "../shared/markets";
import { detectPriceImpulse, type PriceImpulse } from "../shared/price-impulse";
import { getCalendarStatus } from "../shared/economic-calendar";
import {
  disposePriceStreamHooks,
  initPriceStreamHooks,
  pullLiveGoldPrice,
  peekCachedGoldPrice,
} from "./price-stream";
import {
  startTradingViewPriceStream,
  stopTradingViewPriceStream,
} from "./tradingview-price";
import {
  createSignalStabilityState,
  stabilizeTradeAction,
  type SignalStabilityState,
} from "../shared/signal-stability";
import type { Candle, LongTermStrategy, ShortTermStrategy } from "../shared/types";
import { startCalendarService, stopCalendarService } from "./calendar-service";
import { computeNewsIntelligence } from "../shared/news-intelligence";
import { analyzeTechnicals } from "../shared/technical";
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
import { getJournalStats } from "./signal-journal-store";
import { getTranslationCache, setTranslationCache } from "./store";
import { getAiPhase, getAiSessionStatus, getAiSignal, setAiAnalysisRunner } from "./ai-session";
import { runOneShotAiAnalysis } from "./ai-signal-runner";

const PRICE_FAST_MS = 600;
const PRICE_FETCH_MS = 900;
const STRATEGY_TICK_MS = 3000;
const STRATEGY_TICK_IMPULSE_MS = 900;
const HEARTBEAT_MS = 1500;
const INTERNET_CHECK_MS = 25_000;
const DRIVERS_TICK_MS = 20_000;
const NEWS_TICK_MS = 120_000;
const NEWS_ANALYSIS_MS = 45_000;
const TRANSLATE_TICK_MS = 30_000;
const TRANSLATE_BATCH = 4;
const PRICE_STALE_MS = 20_000;
const MAX_PRICE_FAILS = 5;
const MULTI_TF_REFRESH_MS = 12_000;

let priceInterval: ReturnType<typeof setInterval> | null = null;
let strategyInterval: ReturnType<typeof setInterval> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let driversInterval: ReturnType<typeof setInterval> | null = null;
let newsInterval: ReturnType<typeof setInterval> | null = null;
let newsAnalysisInterval: ReturnType<typeof setInterval> | null = null;
let translateInterval: ReturnType<typeof setInterval> | null = null;

let priceBusy = false;
let strategyBusy = false;
let lastInternetOk = true;
let lastInternetCheckAt = 0;
let tickSeq = 0;
let driversBusy = false;
let translating = false;
let priceFailCount = 0;
let lastPriceOkAt = 0;
let lastSnapshot: MonitorSnapshot | null = null;
let rawNews: GoldNewsBundle = { direct: [], macro: [], geopolitics: [] };
let lastNewsAnalysis: NewsMarketAnalysis | null = null;
let analyzingNews = false;
let multiTfCandles: Partial<Record<ChartInterval, Candle[]>> = {};
let multiTfFetchedAt = 0;
let lastStrategyRebuildAt = 0;
let bootstrapPromise: Promise<void> | null = null;
let shortStability = createSignalStabilityState();
let longStability = createSignalStabilityState();
let frozenShort: ShortTermStrategy | null = null;
let frozenLong: LongTermStrategy | null = null;
let lastStrategyPrice = 0;
let priceFetchInFlight = false;
let lastPriceFetchAt = 0;
let lastImpulse: PriceImpulse | null = null;
let strategyTickMs = STRATEGY_TICK_MS;

function getPrimaryCandles(): Candle[] {
  return (
    multiTfCandles["5m"] ??
    multiTfCandles["15m"] ??
    multiTfCandles["1h"] ??
    multiTfCandles["1m"] ??
    []
  );
}

function patchMultiTf(price: number): void {
  for (const tf of SHORT_STRATEGY_INTERVALS) {
    const c = multiTfCandles[tf];
    if (c?.length) multiTfCandles[tf] = patchLastCandle(c, price);
  }
}

function attachSession(snap: MonitorSnapshot): MonitorSnapshot {
  const ai = getAiSessionStatus();
  const aiPhase = getAiPhase();
  const aiSignal = getAiSignal();
  let out: MonitorSnapshot = {
    ...snap,
    monitorSession: ai,
    aiSession: ai,
    aiPhase,
    aiSignal,
  };
  // Klient faqat AI signal — eski YAQIN/UZOQ strategiyalar yuborilmaydi
  out = { ...out, strategy: null, shortStrategy: null };
  return out;
}

export function getMonitorContextForAi(): {
  gold: MonitorSnapshot["gold"];
  newsAnalysis: NewsMarketAnalysis | null;
  newsItems: ReturnType<typeof getTranslatedNews>;
  drivers: MonitorSnapshot["drivers"];
  calendar: MonitorSnapshot["calendar"];
  candles5m: Candle[];
  candles15m: Candle[];
  disciplineScore?: number;
} {
  const gold = lastSnapshot?.gold ?? null;
  return {
    gold,
    newsAnalysis: lastNewsAnalysis,
    newsItems: getTranslatedNews(),
    drivers: lastSnapshot?.drivers ?? [],
    calendar: lastSnapshot?.calendar,
    candles5m: multiTfCandles["5m"] ?? [],
    candles15m: multiTfCandles["15m"] ?? [],
    disciplineScore: lastSnapshot?.platform?.discipline?.score,
  };
}

setAiAnalysisRunner(runOneShotAiAnalysis);

async function refreshMultiTimeframes(spot: number): Promise<void> {
  if (
    Date.now() - multiTfFetchedAt < MULTI_TF_REFRESH_MS &&
    SHORT_STRATEGY_INTERVALS.every((tf) => (multiTfCandles[tf]?.length ?? 0) > 5)
  ) {
    patchMultiTf(spot);
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
    newsAnalysis: null,
    strategy: null,
    shortStrategy: null,
    translating: false,
    analyzingNews: false,
    calendar: getCalendarStatus(),
    marketTechnical: null,
    ...partial,
  };
}

function computeMarketTechnical(spot: number) {
  const candles = patchLastCandle(getPrimaryCandles(), spot);
  if (candles.length < 5) return null;
  return analyzeTechnicals(candles);
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
      const built = buildStrategies(
        lastSnapshot.gold,
        getPrimaryCandles(),
        lastSnapshot.drivers ?? [],
        getTranslatedNews(),
        lastImpulse
      );
      publishSnapshot({
        newsAnalysis: built.newsAnalysis,
        marketTechnical: built.shortStrategy?.technical ?? computeMarketTechnical(lastSnapshot.gold.price),
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
    calendar: partial.calendar ?? getCalendarStatus(),
  };
  lastSnapshot = attachSession(enrichSnapshotWithPlatform(merged));
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
  const items = getTranslatedNews();
  lastNewsAnalysis = computeNewsIntelligence(
    items,
    gold.price,
    getPrimaryCandles(),
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
  candles: Candle[],
  drivers: import("../shared/types").MarketQuote[],
  newsItems: ReturnType<typeof getTranslatedNews>,
  impulse?: PriceImpulse | null
) {
  const na = lastNewsAnalysis;
  const rawLong = computeLongTermStrategy(gold.price, candles, drivers, newsItems, na, impulse);
  const rawShort = computeShortTermStrategy(
    gold.price,
    multiTfCandles,
    drivers,
    newsItems,
    na,
    impulse,
    getJournalStats()
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

function publishGoldTick(gold: import("../shared/types").PriceData, opts?: { forceStrategy?: boolean }) {
  const impulse = detectPriceImpulse(gold.price, {
    minUsd: 1.2,
    windowMs: 45_000,
  });
  const impulseChanged =
    impulse?.direction !== lastImpulse?.direction ||
    Math.abs((impulse?.moveUsd ?? 0) - (lastImpulse?.moveUsd ?? 0)) >= 0.5;
  lastImpulse = impulse;

  markPriceOk();
  tickSeq += 1;
  patchMultiTf(gold.price);

  const moveUsd = Math.abs(gold.price - lastStrategyPrice);
  const priceMoved = moveUsd >= 0.12;
  const bigMove = moveUsd >= 1.0;
  lastStrategyPrice = gold.price;

  const marketTechnical = computeMarketTechnical(gold.price);
  mergeSnapshot({
    online: true,
    priceStale: false,
    feedError: null,
    gold,
    tickSeq,
    priceUpdatedAt: gold.timestamp,
    ...(marketTechnical ? { marketTechnical } : {}),
  });
  broadcast("monitor:update", lastSnapshot);
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

    lastPriceFetchAt = Date.now();
    if (getPrimaryCandles().length === 0) {
      await refreshMultiTimeframes(gold.price);
    }
    publishGoldTick(gold, { forceStrategy: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Xato";
    broadcast("monitor:error", { message: msg });
    markPriceFail(msg);
  } finally {
    priceFetchInFlight = false;
  }
}

function refreshPriceFast() {
  if (priceBusy) return;
  priceBusy = true;
  try {
    const now = Date.now();
    if (now - lastPriceFetchAt >= PRICE_FETCH_MS) {
      void fetchAndPublishPrice();
      return;
    }
    const gold = peekCachedGoldPrice();
    if (!gold) {
      void fetchAndPublishPrice();
      return;
    }
    publishGoldTick(gold);
  } finally {
    priceBusy = false;
  }
}

async function refreshStrategyLive() {
  if (strategyBusy || !lastSnapshot?.gold) return;
  strategyBusy = true;
  try {
    const gold = lastSnapshot.gold;
    if (getPrimaryCandles().length < 5) {
      await refreshMultiTimeframes(gold.price);
    }
    if (getPrimaryCandles().length < 5) return;

    refreshNewsAnalysisLocal();
    await refreshMultiTimeframes(gold.price);
    const built = buildStrategies(
      gold,
      patchLastCandle(getPrimaryCandles(), gold.price),
      lastSnapshot.drivers ?? [],
      getTranslatedNews(),
      lastImpulse
    );
    lastStrategyRebuildAt = Date.now();
    publishSnapshot({
      newsAnalysis: built.newsAnalysis,
      marketTechnical: built.shortStrategy?.technical ?? analyzeTechnicals(patchLastCandle(getPrimaryCandles(), gold.price)),
      signalUpdatedAt: new Date().toISOString(),
    });
  } catch {
    /* keyingi tsiklda */
  } finally {
    strategyBusy = false;
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
      const { shortStrategy, newsAnalysis } = buildStrategies(
        gold,
        getPrimaryCandles(),
        lastSnapshot.drivers ?? [],
        getTranslatedNews(),
        lastImpulse
      );
      publishSnapshot({
        news: newsWithCache(),
        newsAnalysis,
        marketTechnical: shortStrategy?.technical ?? computeMarketTechnical(gold.price),
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
    const gold = await pullLiveGoldPrice(null);
    markPriceOk();

    const [news, drivers] = await Promise.all([fetchGoldNews(), getGoldDrivers(gold)]);
    rawNews = news;
    pruneTranslationCache();
    await refreshMultiTimeframes(gold.price);
    const candles = getPrimaryCandles();
    const allNews = getTranslatedNews();
    lastNewsAnalysis = computeNewsIntelligence(
      allNews,
      gold.price,
      candles,
      drivers,
      multiTfCandles
    );
    const { shortStrategy, newsAnalysis } = buildStrategies(
      gold,
      candles,
      drivers,
      allNews,
      lastImpulse
    );

    const marketTechnical =
      shortStrategy?.technical ?? (candles.length >= 5 ? analyzeTechnicals(candles) : null);
    mergeSnapshot({
      online: true,
      priceStale: false,
      feedError: null,
      gold,
      drivers,
      news: newsWithCache(),
      newsAnalysis,
      marketTechnical,
      translating: false,
      analyzingNews: false,
    });
    lastStrategyRebuildAt = Date.now();
    broadcast("monitor:update", lastSnapshot);
    void runNewsTranslation();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Boshlang'ich yuklash xatosi";
    lastSnapshot = emptySnapshot({ feedError: msg });
    broadcast("monitor:update", lastSnapshot);
    broadcast("monitor:error", { message: msg });
  }
}

function startIntervals() {
  priceInterval = setInterval(refreshPriceFast, PRICE_FAST_MS);
  strategyInterval = setInterval(() => void refreshStrategyLive(), STRATEGY_TICK_MS * 4);
  void fetchAndPublishPrice();
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
    const built = buildStrategies(
      gold,
      getPrimaryCandles(),
      lastSnapshot.drivers ?? [],
      getTranslatedNews(),
      lastImpulse
    );
    lastStrategyRebuildAt = Date.now();
    publishSnapshot({
      newsAnalysis: built.newsAnalysis,
      signalUpdatedAt: new Date().toISOString(),
    });
  }, NEWS_ANALYSIS_MS);
  translateInterval = setInterval(() => void runNewsTranslation(), TRANSLATE_TICK_MS);
  void runNewsTranslation();
}

export function startMonitorService(): void {
  if (priceInterval) return;
  startCalendarService();
  initPriceStreamHooks(() => {
    if (priceBusy) return;
    const gold = peekCachedGoldPrice();
    if (gold?.feed === "tradingview") publishGoldTick(gold);
  });
  if (!lastSnapshot) lastSnapshot = emptySnapshot();

  const run = async () => {
    await startTradingViewPriceStream();
    const boot = bootstrapPromise ?? bootstrapSnapshot();
    bootstrapPromise = boot;
    try {
      await boot;
      startIntervals();
      void refreshStrategyLive();
    } finally {
      bootstrapPromise = null;
    }
  };
  void run();
}

export async function refreshNewsDeepAnalysis(): Promise<NewsMarketAnalysis | null> {
  return refreshNewsAnalysisLocal();
}

export function runNewsDeepAnalysis(): Promise<NewsMarketAnalysis | null> {
  return Promise.resolve(refreshNewsAnalysisLocal());
}

export function stopMonitorService(): void {
  stopCalendarService();
  disposePriceStreamHooks();
  void stopTradingViewPriceStream();
  if (priceInterval) clearInterval(priceInterval);
  if (strategyInterval) clearInterval(strategyInterval);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (driversInterval) clearInterval(driversInterval);
  if (newsInterval) clearInterval(newsInterval);
  if (newsAnalysisInterval) clearInterval(newsAnalysisInterval);
  if (translateInterval) clearInterval(translateInterval);
  priceInterval = null;
  strategyInterval = null;
  heartbeatInterval = null;
  driversInterval = null;
  newsInterval = null;
  newsAnalysisInterval = null;
  translateInterval = null;
  priceBusy = false;
  strategyBusy = false;
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
  if (!lastSnapshot) return attachSession(emptySnapshot());
  return attachSession({ ...lastSnapshot });
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

export async function runForecast(): Promise<LongTermForecast> {
  const gold = await pullLiveGoldPrice(lastSnapshot?.gold ?? null);
  if (getPrimaryCandles().length < 10) {
    await refreshMultiTimeframes(gold.price);
  }
  const candles = getPrimaryCandles();
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
