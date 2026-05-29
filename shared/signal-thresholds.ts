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

/** Yaqin (scalp) — tez bozor harakatida signal berish uchun yumshoq */
export const SHORT_THRESHOLDS = {
  minFilters: 2,
  filterTotal: 7,
  minStrength: 40,
  minConfluence: 38,
  minRiskReward: 1.35,
  minNewsConfidence: 28,
  minNewsStrength: 20,
  minBiasScore: 0.85,
  minTfVoteRatio: 0.2,
};

export type ShortThresholdSet = typeof SHORT_THRESHOLDS;

export function getShortThresholds(journal?: JournalStats | null): ShortThresholdSet {
  return useStrictShortMode(journal) ? STRICT_SHORT_THRESHOLDS : SHORT_THRESHOLDS;
}
