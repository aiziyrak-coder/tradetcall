/** Signal qattiqligi — uzoq yumsharoq, yaqin TF asosida */

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

export const SHORT_THRESHOLDS = {
  minFilters: 5,
  filterTotal: 7,
  minStrength: 58,
  minConfluence: 68,
  minRiskReward: 1.9,
  minNewsConfidence: 46,
  minNewsStrength: 40,
  minBiasScore: 2.2,
  minTfVoteRatio: 0.5,
};
