import type { CapitalShieldState } from "./capital-shield";
import type { MarketQuality } from "./market-quality";
import type { NewsFreshness } from "./news-freshness";
import type { PriceDivergence } from "./price-divergence";

export interface DisciplineRule {
  id: string;
  labelUz: string;
  ok: boolean;
  detailUz: string;
}

export interface TradingDiscipline {
  score: number;
  passed: number;
  total: number;
  rules: DisciplineRule[];
  summaryUz: string;
}

/** Professional qoidalar — 8-band: nima qilmaslik */
export function evaluateTradingDiscipline(input: {
  marketQuality: MarketQuality;
  capitalShield: CapitalShieldState;
  newsFreshness: NewsFreshness;
  priceDivergence: PriceDivergence | null;
  signalsToday: number;
  maxSignalsPerDay: number;
}): TradingDiscipline {
  const rules: DisciplineRule[] = [
    {
      id: "no_overtrade",
      labelUz: "Kuniga ortiqcha signal",
      ok: input.signalsToday <= input.maxSignalsPerDay,
      detailUz: `${input.signalsToday}/${input.maxSignalsPerDay} limit`,
    },
    {
      id: "market_ok",
      labelUz: "Bozor sifati yetarli",
      ok: input.marketQuality.tradeable,
      detailUz: `${input.marketQuality.score}/100`,
    },
    {
      id: "shield_ok",
      labelUz: "Kapital himoyasi yashil",
      ok: input.capitalShield.allowed,
      detailUz: input.capitalShield.levelUz,
    },
    {
      id: "news_fresh",
      labelUz: "Yangiliklar yangi",
      ok: !input.newsFreshness.stale,
      detailUz: input.newsFreshness.freshnessUz.slice(0, 50),
    },
    {
      id: "price_sync",
      labelUz: "MT5/Yahoo mos",
      ok: !input.priceDivergence?.severe,
      detailUz: input.priceDivergence?.trustUz ?? "Yahoo rejimi",
    },
    {
      id: "no_revenge",
      labelUz: "Ketma-ket zarar tanaffus",
      ok: input.capitalShield.stats.consecutiveLosses < 2,
      detailUz: `Ketma-ket zarar: ${input.capitalShield.stats.consecutiveLosses}`,
    },
    {
      id: "spread",
      labelUz: "Spread qabul qilinadigan",
      ok: (input.marketQuality.spreadPts ?? 0) <= 0.45,
      detailUz: input.marketQuality.spreadPts != null
        ? `$${input.marketQuality.spreadPts}`
        : "—",
    },
    {
      id: "no_greed",
      labelUz: "Kunlik foyda limiti",
      ok: (input.capitalShield.stats.estimatedProfitPct ?? 0) < 2,
      detailUz: `Taxminiy kunlik foyda ${(input.capitalShield.stats.estimatedProfitPct ?? 0).toFixed(1)}%`,
    },
  ];

  const passed = rules.filter((r) => r.ok).length;
  const total = rules.length;
  const score = Math.round((passed / total) * 100);

  const summaryUz =
    score >= 75
      ? "Professional rejim — qoidalar asosan bajarilgan"
      : score >= 50
        ? "Ehtiyot — ba'zi qoidalar buzilgan, lot kichik"
        : "Bugun savdo qilmang — qoidalar ko'p buzilgan";

  return { score, passed, total, rules, summaryUz };
}
