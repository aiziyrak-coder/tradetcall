import type { SignalDetail } from "./signal-detail";
import type { CalendarStatus } from "./calendar-types";

export type { CalendarStatus, EconomicEvent, CalendarImpact } from "./calendar-types";
export type { HorizonVerdict, TradeAction } from "./horizon-verdict";

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
  bid?: number;
  ask?: number;
  spread?: number;
  feed?: "tradingview" | "yahoo" | "spot";
  /** Oxirgi tick delta ($) */
  tickDelta?: number;
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
  atr: number;
  adx: number;
  priorDayHigh?: number;
  priorDayLow?: number;
  enhanced?: import("./enhanced-technical").EnhancedIndicators;
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
  playbookUz: string;
  tacticsUz: string[];
  verdict: import("./horizon-verdict").HorizonVerdict;
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
  playbookUz: string;
  tacticsUz: string[];
  verdict: import("./horizon-verdict").HorizonVerdict;
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

export type { PlatformInsight, JournalStats } from "./platform-insight";
export type { SignalJournalEntry, SignalJournalSnapshot } from "./signal-journal-types";

export type { AiPhase, AiTradeSignal, AiTradeAction } from "./ai-trade-signal";

export interface MonitorSessionInfo {
  active: boolean;
  phase?: import("./ai-trade-signal").AiPhase;
  messageUz?: string;
  endsAt: string | null;
  remainingMs: number;
  autoStopMinutes: number;
}

export interface MonitorSnapshot {
  timestamp: string;
  online: boolean;
  /** @deprecated aiSession bilan bir xil — eski klientlar uchun */
  monitorSession?: MonitorSessionInfo;
  aiSession?: MonitorSessionInfo;
  priceStale?: boolean;
  feedError?: string | null;
  gold: PriceData | null;
  drivers: MarketQuote[];
  news: GoldNewsBundle;
  newsAnalysis: NewsMarketAnalysis | null;
  strategy: LongTermStrategy | null;
  shortStrategy: ShortTermStrategy | null;
  aiSignal?: import("./ai-trade-signal").AiTradeSignal | null;
  aiPhase?: import("./ai-trade-signal").AiPhase;
  tickSeq?: number;
  priceUpdatedAt?: string;
  signalUpdatedAt?: string;
  translating?: boolean;
  analyzingNews?: boolean;
  calendar?: CalendarStatus;
  /** Jonli texnik (RSI, ADX, qo'llab-quvvatlash) — strategiyasiz */
  marketTechnical?: TechnicalAnalysis | null;
  /** M1 skalp trend oldindan */
  m1Scalp?: import("./m1-scalp").M1ScalpLead | null;
  liveMomentum?: import("./scalp-signal-guard").LiveMomentum | null;
  setupQuality?: import("./setup-quality").SetupQuality | null;
  platform?: import("./platform-insight").PlatformInsight;
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
