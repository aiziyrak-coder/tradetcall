/** Signal qattiqligi — uzoq yumsharoq, yaqin TF + impuls uchun yumshoq */

export const LONG_THRESHOLDS = {
  minFilters: 5,
  filterTotal: 7,
  minStrength: 62,
  minConfluence: 70,
  minRiskReward: 2.0,
  minNewsConfidence: 48,
  minNewsStrength: 42,
  minBiasScore: 2.4,
};

/** Yaqin (scalp) — tez bozor harakatida signal berish uchun yumshoq */
export const SHORT_THRESHOLDS = {
  minFilters: 4,
  filterTotal: 7,
  minStrength: 48,
  minConfluence: 55,
  minRiskReward: 1.6,
  minNewsConfidence: 36,
  minNewsStrength: 28,
  minBiasScore: 1.4,
  minTfVoteRatio: 0.26,
};
