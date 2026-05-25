import type { Candle, MarketFlow } from "./types";

/** Sham hajmi va yopilish yo'nalishi bo'yicha BUY/SELL taqsimoti (spot proxy) */
export function computeMarketFlow(
  candles: Candle[],
  window = 24,
  intervalLabel = "5m"
): MarketFlow {
  const slice = candles.slice(-window);
  if (slice.length < 3) {
    return {
      buyVolume: 0,
      sellVolume: 0,
      buyPct: 50,
      sellPct: 50,
      delta: 0,
      pressure: "neutral",
      labelUz: "Ma'lumot yetarli emas",
      windowUz: `oxirgi ${window} ta ${intervalLabel} sham`,
    };
  }

  let buyVol = 0;
  let sellVol = 0;

  for (const c of slice) {
    const range = Math.max(c.high - c.low, 0.01);
    const body = Math.abs(c.close - c.open);
    const vol = range * (0.6 + (body / range) * 0.4);
    if (c.close >= c.open) buyVol += vol;
    else sellVol += vol;
  }

  const total = buyVol + sellVol || 1;
  const buyPct = Math.round((buyVol / total) * 100);
  const sellPct = 100 - buyPct;
  const delta = Math.round(((buyVol - sellVol) / total) * 100);

  let pressure: MarketFlow["pressure"] = "neutral";
  if (buyPct >= 58) pressure = "buy";
  else if (sellPct >= 58) pressure = "sell";

  const labelUz =
    pressure === "buy"
      ? `Bozor xaridorlari ustun (${buyPct}% BUY bosimi)`
      : pressure === "sell"
        ? `Sotuv bosimi ustun (${sellPct}% SELL)`
        : `Muvozanatli order flow (${buyPct}/${sellPct})`;

  return {
    buyVolume: Math.round(buyVol * 100) / 100,
    sellVolume: Math.round(sellVol * 100) / 100,
    buyPct,
    sellPct,
    delta,
    pressure,
    labelUz,
    windowUz: `oxirgi ${slice.length} ta ${intervalLabel} sham`,
  };
}
