import type { MarketQuote, NewsMarketAnalysis } from "./types";

export interface MacroCorrelation {
  dxyChangePct: number | null;
  goldChangePct: number | null;
  aligned: boolean;
  biasUz: string;
  warningUz: string | null;
  yieldsChangePct: number | null;
}

/** Dollar kuchayishi → oltin bosim (klassik korrelyatsiya) */
export function analyzeMacroCorrelation(
  drivers: MarketQuote[],
  news: NewsMarketAnalysis | null
): MacroCorrelation {
  const dxy = drivers.find((d) => /dollar|dxy/i.test(d.name));
  const gold = drivers.find((d) => /xau|gold|oltin/i.test(d.name));
  const yields = drivers.find((d) => /10y|renta|tnx/i.test(d.name));

  const dxyChangePct = dxy?.changePercent ?? null;
  const goldChangePct = gold?.changePercent ?? null;
  const yieldsChangePct = yields?.changePercent ?? null;

  let aligned = true;
  let biasUz = "Makro neytral";
  let warningUz: string | null = null;

  if (dxyChangePct != null && goldChangePct != null) {
    const dxyUp = dxyChangePct > 0.08;
    const dxyDown = dxyChangePct < -0.08;
    const goldUp = goldChangePct > 0.05;
    const goldDown = goldChangePct < -0.05;

    if (dxyUp && goldUp) {
      aligned = false;
      warningUz = "DXY ↑ va oltin ↑ — zid harakat, ehtiyot (fake breakout)";
      biasUz = "Zid makro";
    } else if (dxyUp && goldDown) {
      aligned = true;
      biasUz = "Dollar kuchli → oltin bosim (klassik)";
      if (news?.overallBias === "bullish") {
        warningUz = "Long signalga qarshi makro — dollar kuchayapti";
      }
    } else if (dxyDown && goldUp) {
      aligned = true;
      biasUz = "Dollar zaif → oltin qo'llab-quvvatlanadi";
    } else if (dxyDown && goldDown) {
      aligned = false;
      warningUz = "DXY ↓ lekin oltin ↓ — risk-off yoki ma'lumot kechikdi";
      biasUz = "Noaniq makro";
    }
  }

  if (yieldsChangePct != null && yieldsChangePct > 0.15 && goldChangePct != null && goldChangePct > 0.1) {
    warningUz = warningUz ?? "Rentablar ↑ + oltin ↑ — barqaror emas";
    aligned = false;
  }

  return {
    dxyChangePct,
    goldChangePct,
    aligned,
    biasUz,
    warningUz,
    yieldsChangePct,
  };
}
