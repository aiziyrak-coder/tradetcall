import type { SignalDetail } from "./signal-detail";

export type NewsStream = "direct" | "macro" | "geopolitics";

export interface NewsItem {
  id: string;
  title: string;
  titleUz?: string;
  summary: string;
  summaryUz?: string;
  link: string;
  source: string;
  publishedAt: string;
  stream?: NewsStream;
  timeAgo?: string;
  alert?: boolean;
  goldRelated?: boolean;
  sentiment?: "bullish" | "bearish" | "neutral";
  impact?: "high" | "medium" | "low";
  goldImpactUz?: string;
}

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high24h?: number;
  low24h?: number;
  timestamp: string;
  source: string;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface GoldNewsBundle {
  direct: NewsItem[];
  macro: NewsItem[];
  geopolitics: NewsItem[];
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TechnicalAnalysis {
  rsi: number;
  trend: "bullish" | "bearish" | "neutral";
  sma20: number;
  sma50: number;
  support: number[];
  resistance: number[];
  momentum: string;
}

/** Uzoq muddatli savdo qadami */
export interface StrategyStep {
  title: string;
  whenUz: string;
  priceHint: string;
  priceFrom?: number;
  priceTo?: number;
}

/** Hafta/kunlik strategiya — BUY/SELL/HOLD emas */
export interface LongTermStrategy {
  /** long = sotib olish rejasi, short = sotish, wait = hozir kirmang */
  bias: "long" | "short" | "wait";
  horizonUz: string;
  confidence: number;
  situationUz: string;
  entry: StrategyStep;
  exit: StrategyStep;
  stopLoss: number;
  takeProfit: number;
  invalidationUz: string;
  technical: TechnicalAnalysis;
  signal: SignalDetail;
  keyLevels: { label: string; price: number }[];
}

export interface ChartData {
  interval: string;
  candles: Candle[];
}

export interface LongTermForecast {
  bias: "long" | "short" | "wait";
  horizonUz: string;
  confidence: number;
  situationUz: string;
  entry: StrategyStep;
  exit: StrategyStep;
  stopLoss: number;
  takeProfit: number;
  invalidationUz: string;
  weekPlanUz: string;
  keyFactors: string[];
  riskWarning: string;
  summaryUz: string;
}

/** Qisqa muddat — bitta timeframe ko'rinishi */
export interface TimeframeSignal {
  interval: string;
  labelUz: string;
  trend: "bullish" | "bearish" | "neutral";
  rsi: number;
  bias: "long" | "short" | "neutral";
  noteUz: string;
}

/** 30 daqiqagacha lot — barcha TF lar bo'yicha */
export interface ShortTermStrategy {
  bias: "long" | "short" | "wait";
  horizonUz: string;
  confidence: number;
  situationUz: string;
  entry: StrategyStep;
  exit: StrategyStep;
  stopLoss: number;
  takeProfit: number;
  maxHoldMinutes: number;
  lotRuleUz: string;
  timeframes: TimeframeSignal[];
  invalidationUz: string;
  technical: TechnicalAnalysis;
  signal: SignalDetail;
  tfAligned: number;
  tfTotal: number;
  keyLevels: { label: string; price: number }[];
}

/** Kelajakda narxga ta'sir qiluvchi omil */
export interface NewsFactor {
  id: string;
  nameUz: string;
  direction: "bullish" | "bearish" | "mixed";
  weight: number;
  horizonUz: string;
  explanationUz: string;
  relatedHeadlines?: string[];
}

export interface NewsItemInsight {
  newsId: string;
  titleUz: string;
  sentiment: "bullish" | "bearish" | "neutral";
  impact: "high" | "medium" | "low";
  impactUz: string;
  stream: string;
}

/** Yangiliklar + shamlar + bozor muhokamasi */
export interface NewsMarketAnalysis {
  updatedAt: string;
  overallBias: "bullish" | "bearish" | "neutral";
  biasStrength: number;
  narrativeUz: string;
  trendOutlookUz: string;
  candleAlignmentUz: string;
  newsCandleAligned: boolean;
  futureFactors: NewsFactor[];
  risksUz: string[];
  opportunitiesUz: string[];
  contradictionsUz: string | null;
  headlineSummaryUz: string;
  itemInsights: NewsItemInsight[];
  confidence: number;
  recommendationUz: string;
  /** Qisqa savdo hukmi (bashorat paneli) */
  tradeVerdictUz?: string;
  /** 24–72 soat prognoz (bir qator) */
  forecastUz?: string;
  newsScore: number;
  bullCount: number;
  bearCount: number;
  /** AI qo'shimcha tahlil (bo'lsa) */
  aiDiscussionUz?: string;
  aiFutureOutlookUz?: string;
}

export interface MonitorSnapshot {
  timestamp: string;
  online: boolean;
  priceStale?: boolean;
  feedError?: string | null;
  gold: PriceData | null;
  drivers: MarketQuote[];
  news: GoldNewsBundle;
  newsAnalysis: NewsMarketAnalysis | null;
  chart: ChartData;
  strategy: LongTermStrategy | null;
  shortStrategy: ShortTermStrategy | null;
  translating?: boolean;
  analyzingNews?: boolean;
}

export type UserRole = "admin" | "user";

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface UserPublic {
  id: string;
  username: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface Session {
  userId: string;
  username: string;
  role: UserRole;
}
