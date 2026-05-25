import type { HorizonVerdict } from "./horizon-verdict";
import { calcPositionSize } from "./risk-calculator";
import type { SignalDetail } from "./signal-detail";

export interface TradePlanInput {
  horizon: "long" | "short";
  horizonLabelUz: string;
  verdict: HorizonVerdict;
  signal: SignalDetail;
  accountUsd: number;
  riskPercent: number;
  maxHoldMinutes?: number;
}

export interface TradePlan {
  action: "BUY" | "SELL" | "HOLD";
  trusted: boolean;
  filterPassed: number;
  filterTotal: number;
  suggestedLots: number;
  riskUsd: number;
  slDistanceUsd: number;
  holdMinutes: number;
  holdExplainUz: string;
  lotsExplainUz: string;
  entryZoneUz: string;
  exitRuleUz: string;
  summaryUz: string;
  stepsUz: string[];
}

export function formatHoldUz(minutes: number): string {
  if (minutes < 60) return `${minutes} daqiqa`;
  if (minutes < 24 * 60) {
    const h = Math.round(minutes / 60);
    return h === 1 ? "1 soat" : `${h} soat`;
  }
  const days = Math.round(minutes / (24 * 60));
  if (days < 14) return days === 1 ? "1 kun" : `${days} kun`;
  const weeks = Math.round(days / 7);
  return weeks <= 1 ? "1 hafta" : `${weeks} hafta`;
}

export function buildTradePlan(input: TradePlanInput): TradePlan {
  const { verdict, signal, horizon } = input;
  const filterTotal = verdict.checklist.length || 7;
  const filterPassed = verdict.checklist.filter((c) => c.ok).length;
  const trusted =
    verdict.action !== "HOLD" &&
    verdict.gateAllowed &&
    filterPassed >= 7 &&
    verdict.strength >= 82;

  const holdMinutes =
    input.maxHoldMinutes ?? (horizon === "short" ? 30 : 28 * 24 * 60);

  const holdExplainUz =
    horizon === "short"
      ? `Bozorda maksimum ${formatHoldUz(30)}. Vaqt tugasa yoki TP bo'lsa — chiqing. SL majburiy.`
      : `Swing: ${formatHoldUz(holdMinutes)} gacha ushlab turing. Kunlik yopilish SL dan o'tsa — darhol chiqing.`;

  const entryZoneUz = `$${signal.entryFrom} — $${signal.entryTo}`;
  const exitRuleUz =
    horizon === "short"
      ? `TP $${signal.takeProfit} yoki ${formatHoldUz(30)} ichida. SL $${signal.stopLoss} — qo'lda kengaytirmang.`
      : `TP $${signal.takeProfit}. Qisman foyda oling, qolganini trailing. SL $${signal.stopLoss}.`;

  if (!trusted || verdict.action === "HOLD") {
    return {
      action: verdict.action,
      trusted: false,
      filterPassed,
      filterTotal,
      suggestedLots: 0,
      riskUsd: 0,
      slDistanceUsd: 0,
      holdMinutes,
      holdExplainUz,
      lotsExplainUz:
        filterPassed < 7
          ? `Hozir kirmang: ${filterPassed}/${filterTotal} filter. 7/7 MOS bo'lganda lot chiqadi.`
          : "Signal HOLD — lot 0. Kuting.",
      entryZoneUz,
      exitRuleUz,
      summaryUz: `${input.horizonLabelUz}: HOLD — savdo yo'q`,
      stepsUz: [
        "Pozitsiya ochmang.",
        verdict.reliabilityUz,
        holdExplainUz,
      ],
    };
  }

  const risk = calcPositionSize({
    accountUsd: input.accountUsd,
    riskPercent: input.riskPercent,
    entry: signal.entryPrice,
    stopLoss: signal.stopLoss,
  });

  let lots = risk.suggestedLots;
  if (filterPassed === 7 && verdict.strength >= 88) {
    lots = risk.suggestedLots;
  } else if (filterPassed >= 6) {
    lots = Math.round(risk.suggestedLots * 0.5 * 100) / 100;
  } else {
    lots = 0;
  }
  lots = Math.max(0, Math.min(lots, 10));

  const lotsExplainUz =
    lots < 0.01
      ? "Depozit yoki SL masofasi noto'g'ri — lot hisoblanmadi."
      : `Depozit $${input.accountUsd}, risk ${input.riskPercent}% → taxminan ${lots} lot. ` +
        `1 lot = 100 unsiya oltin. SL ${risk.slDistanceUsd}$ masofada — shu masofa zarar chegarasi. ` +
        `Broker minimal lot odatda 0.01. Spread keng bo'lsa lotni kamaytiring.`;

  const dirUz = verdict.action === "BUY" ? "sotib oling" : "soting";
  const stepsUz =
    horizon === "short"
      ? [
          `1. ${verdict.action}: ${lots} lot bilan ${entryZoneUz} zonadan ${dirUz}.`,
          `2. SL $${signal.stopLoss} — darhol qo'ying.`,
          `3. TP $${signal.takeProfit} yoki maksimum ${formatHoldUz(30)} — keyin yoping.`,
          `4. Yangiliklar zid bo'lsa yoki spread kengaysa — pozitsiyani yoping.`,
        ]
      : [
          `1. ${verdict.action}: ${lots} lot bilan ${entryZoneUz} zonadan ${dirUz} — swing.`,
          `2. SL $${signal.stopLoss} — kunlik yopilishda ushlang.`,
          `3. Maqsad $${signal.takeProfit}. ${formatHoldUz(holdMinutes)} gacha ushlab turing.`,
          `4. Qisman TP qiling, qolganini trailing stop.`,
        ];

  const summaryUz = `${input.horizonLabelUz} ${verdict.action} · ${lots} lot · ${formatHoldUz(horizon === "short" ? 30 : holdMinutes)} · ${entryZoneUz}`;

  return {
    action: verdict.action,
    trusted: true,
    filterPassed,
    filterTotal,
    suggestedLots: lots,
    riskUsd: risk.riskUsd,
    slDistanceUsd: risk.slDistanceUsd,
    holdMinutes: horizon === "short" ? 30 : holdMinutes,
    holdExplainUz,
    lotsExplainUz,
    entryZoneUz,
    exitRuleUz,
    summaryUz,
    stepsUz,
  };
}
