import type { JournalStats } from "./platform-insight";
import { STRICT_SHORT_THRESHOLDS, useStrictShortMode } from "./profit-protection";

/** Signal qattiqligi — uzoq yumsharoq, yaqin TF + impuls uchun yumshoq */

export const LONG_THRESHOLDS = {
  minFilters: 4,
  filterTotal: 7,
  minStrength: 58,
  minConfluence: 65,
  minRiskReward: 1.9,
  minNewsConfidence: 44,
  minNewsStrength: 38,
  minBiasScore: 2.0,
};

/** M1 skalping — 1m trend ustun, tez kirish/chiqish */
export const SHORT_THRESHOLDS = {
  minFilters: 2,
  filterTotal: 7,
  minStrength: 36,
  minConfluence: 32,
  minRiskReward: 1.25,
  minNewsConfidence: 22,
  minNewsStrength: 16,
  minBiasScore: 0.7,
  minTfVoteRatio: 0.15,
};

export type ShortThresholdSet = typeof SHORT_THRESHOLDS;

export function getShortThresholds(journal?: JournalStats | null): ShortThresholdSet {
  return useStrictShortMode(journal) ? STRICT_SHORT_THRESHOLDS : SHORT_THRESHOLDS;
}
