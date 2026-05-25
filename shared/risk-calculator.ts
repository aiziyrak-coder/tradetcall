/** Professional risk: lot hajmi SL masofasidan */

export interface RiskCalcInput {
  accountUsd: number;
  riskPercent: number;
  entry: number;
  stopLoss: number;
  /** 1 lot = 100 oz (standart) */
  ozPerLot?: number;
}

export interface RiskCalcResult {
  riskUsd: number;
  slDistanceUsd: number;
  suggestedLots: number;
  hintUz: string;
}

export function calcPositionSize(input: RiskCalcInput): RiskCalcResult {
  const oz = input.ozPerLot ?? 100;
  const riskUsd = (input.accountUsd * input.riskPercent) / 100;
  const slDistanceUsd = Math.abs(input.entry - input.stopLoss);
  if (slDistanceUsd <= 0 || riskUsd <= 0) {
    return {
      riskUsd: 0,
      slDistanceUsd: 0,
      suggestedLots: 0,
      hintUz: "Kirish yoki SL noto'g'ri — hisoblab bo'lmaydi",
    };
  }
  const lossPerLot = slDistanceUsd * oz;
  const lots = Math.round((riskUsd / lossPerLot) * 100) / 100;
  const capped = Math.min(lots, 10);
  return {
    riskUsd: Math.round(riskUsd * 100) / 100,
    slDistanceUsd: Math.round(slDistanceUsd * 100) / 100,
    suggestedLots: capped,
    hintUz:
      capped < 0.01
        ? "SL juda keng yoki depozit kichik"
        : `Depozit $${input.accountUsd}, risk ${input.riskPercent}% → ~${capped} lot (100oz/lot). Broker spreadni hisobga oling.`,
  };
}
