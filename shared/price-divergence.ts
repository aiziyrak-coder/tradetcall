export interface PriceDivergence {
  mt5Price: number | null;
  yahooPrice: number | null;
  diffUsd: number;
  diffPct: number;
  severe: boolean;
  trustUz: string;
}

/** MT5 va Yahoo farqi — signal ishonchliligi */
export function computePriceDivergence(
  mt5Price: number | null,
  yahooPrice: number | null
): PriceDivergence | null {
  if (mt5Price == null || yahooPrice == null || mt5Price <= 0) return null;

  const diffUsd = Math.round((mt5Price - yahooPrice) * 100) / 100;
  const diffPct = Math.round((diffUsd / mt5Price) * 10000) / 100;
  const abs = Math.abs(diffUsd);
  const severe = abs >= 1.5 || Math.abs(diffPct) >= 0.08;

  let trustUz: string;
  if (abs < 0.35) {
    trustUz = "MT5 va Yahoo mos — narx ishonchli";
  } else if (abs < 1.0) {
    trustUz = `Kichik farq $${abs} — scalpda ehtiyot`;
  } else {
    trustUz = `Katta farq $${abs} (${diffPct}%) — signal kechikishi mumkin`;
  }

  return {
    mt5Price,
    yahooPrice,
    diffUsd,
    diffPct,
    severe,
    trustUz,
  };
}
