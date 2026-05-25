import type { StrategyStep } from "./types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Gate wait holatida SL/TP/kirish zonasini kuzatuv rejimiga o'tkazish */
export function waitTradeLevels(
  price: number,
  sup: number,
  res: number,
  atr: number
): {
  entry: StrategyStep;
  exit: StrategyStep;
  stopLoss: number;
  takeProfit: number;
  entryFrom: number;
  entryTo: number;
  exitPrice: number;
} {
  const entryFrom = round2(sup);
  const entryTo = round2(res);
  const entry: StrategyStep = {
    title: "KIRISH",
    whenUz: "HOZIR KIRMANG — professional signal yo'q",
    priceHint: `Kuzatuv: $${entryFrom} / $${entryTo}`,
    priceFrom: entryFrom,
    priceTo: entryTo,
  };
  const exit: StrategyStep = { title: "CHIQISH", whenUz: "—", priceHint: "—" };
  const stopLoss = round2(price - atr * 2);
  const takeProfit = round2(price + atr * 2);
  const exitPrice = round2(price);
  return { entry, exit, stopLoss, takeProfit, entryFrom, entryTo, exitPrice };
}
