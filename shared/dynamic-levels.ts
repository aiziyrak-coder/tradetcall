/** ATR asosida dinamik SL/TP — volatillikka mos */

export interface DynamicLevelMultipliers {
  slAtr: number;
  tpAtr: number;
  noteUz: string;
}

export function getDynamicLevelMultipliers(
  atr: number,
  price: number,
  adx: number
): DynamicLevelMultipliers {
  const atrPct = price > 0 ? (atr / price) * 100 : 0;

  if (atrPct >= 0.12 || adx >= 28) {
    return {
      slAtr: 1.15,
      tpAtr: 1.35,
      noteUz: "Yuqori volatillik — kengroq SL/TP, kichik lot",
    };
  }
  if (atrPct >= 0.07 || adx >= 20) {
    return {
      slAtr: 1.0,
      tpAtr: 1.25,
      noteUz: "O'rtacha volatillik — standart ATR",
    };
  }
  return {
    slAtr: 0.85,
    tpAtr: 1.1,
    noteUz: "Past volatillik — tor SL/TP, tez chiqish",
  };
}
