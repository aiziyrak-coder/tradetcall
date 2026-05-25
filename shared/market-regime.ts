import type { MarketQuote } from "./types";

export interface MarketRegime {
  /** -2 .. +2 — oltin long uchun qo'shimcha ball */
  goldLongAdjust: number;
  /** long/short/wait tavsiyasi */
  macroBias: "bullish" | "bearish" | "neutral";
  summaryUz: string;
  dxyNoteUz: string;
  yieldsNoteUz: string;
}

export function evaluateMarketRegime(drivers: MarketQuote[]): MarketRegime {
  const dxy = drivers.find((d) => /dollar|dxy/i.test(d.name));
  const yields = drivers.find((d) => /yield|tnx|treasury|10y/i.test(d.name));
  const silver = drivers.find((d) => /silver|si=/i.test(d.symbol + d.name));

  let goldLongAdjust = 0;
  const notes: string[] = [];

  if (dxy) {
    const ch = dxy.changePercent;
    if (ch > 0.35) {
      goldLongAdjust -= 1.2;
      notes.push(`DXY +${ch.toFixed(2)}% — oltin uchun bosim`);
    } else if (ch < -0.35) {
      goldLongAdjust += 1.2;
      notes.push(`DXY ${ch.toFixed(2)}% — oltin qo'llab-quvvat`);
    }
  }

  if (yields) {
    const ch = yields.changePercent;
    if (ch > 0.25) {
      goldLongAdjust -= 0.9;
      notes.push(`Yields +${ch.toFixed(2)}% — real foiz oltinni bosadi`);
    } else if (ch < -0.25) {
      goldLongAdjust += 0.8;
      notes.push(`Yields ${ch.toFixed(2)}% — oltin uchun ijobiy`);
    }
  }

  if (silver && silver.changePercent > 0.4) goldLongAdjust += 0.4;
  if (silver && silver.changePercent < -0.4) goldLongAdjust -= 0.4;

  goldLongAdjust = Math.max(-2, Math.min(2, goldLongAdjust));

  let macroBias: MarketRegime["macroBias"] = "neutral";
  if (goldLongAdjust >= 1) macroBias = "bullish";
  else if (goldLongAdjust <= -1) macroBias = "bearish";

  const dxyNoteUz = dxy
    ? `DXY ${dxy.changePercent >= 0 ? "+" : ""}${dxy.changePercent.toFixed(2)}%`
    : "DXY kutilmoqda";
  const yieldsNoteUz = yields
    ? `10Y ${yields.changePercent >= 0 ? "+" : ""}${yields.changePercent.toFixed(2)}%`
    : "Yields kutilmoqda";

  return {
    goldLongAdjust,
    macroBias,
    summaryUz: notes.length ? notes.join(". ") : "Makro neytral — texnik + yangiliklar asosiy",
    dxyNoteUz,
    yieldsNoteUz,
  };
}
