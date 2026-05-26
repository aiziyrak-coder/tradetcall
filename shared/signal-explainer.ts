import type { TradeAction } from "./horizon-verdict";
import type { HorizonVerdict } from "./horizon-verdict";
import type { TradeGateResult } from "./trade-gate";
import { SHORT_THRESHOLDS, LONG_THRESHOLDS } from "./signal-thresholds";
import type { MarketQuality } from "./market-quality";

export interface SignalBlocker {
  id: string;
  labelUz: string;
  ok: boolean;
  detailUz: string;
}

export interface SignalExplainer {
  horizon: "long" | "short";
  horizonLabelUz: string;
  action: TradeAction;
  rawBiasUz: string;
  readinessPct: number;
  blockers: SignalBlocker[];
  unlockUz: string[];
  coachUz: string;
}

function unlockHints(
  horizon: "long" | "short",
  blockers: SignalBlocker[],
  tfAligned?: number,
  tfTotal?: number
): string[] {
  const hints: string[] = [];
  const cfg = horizon === "short" ? SHORT_THRESHOLDS : LONG_THRESHOLDS;

  for (const b of blockers.filter((x) => !x.ok)) {
    if (b.id === "gate") hints.push("TF + yangiliklar + R:R bir yo'nalishda bo'lishi kerak");
    if (b.id === "filters") hints.push(`${cfg.minFilters}/${cfg.filterTotal} filter to'ldirilishi kerak`);
    if (b.id === "news") hints.push(`Yangiliklar ishonchi ≥${cfg.minNewsConfidence}% yoki TF kuchli mos`);
    if (b.id === "confluence") hints.push(`Moslik ≥${cfg.minConfluence}%`);
    if (b.id === "strength") hints.push(`Signal kuchi ≥${cfg.minStrength}%`);
    if (b.id === "market") hints.push("Bozor sifati C dan yuqori bo'lsin — MT5, spread");
    if (b.id === "calendar") hints.push("Makro oynadan chiqing");
    if (b.id === "stability") hints.push("Barqarorlik qulfi — bir necha soniya kuting");
  }

  const tfRatioMin =
    horizon === "short" ? SHORT_THRESHOLDS.minTfVoteRatio : 0.5;
  if (tfTotal && tfAligned != null && tfAligned / tfTotal < tfRatioMin) {
    const need = Math.ceil(tfTotal * tfRatioMin);
    hints.push(`TF: ${need}/${tfTotal} timeframe bir yo'nalishda bo'lishi kerak`);
  }

  return [...new Set(hints)].slice(0, 5);
}

/** Nima uchun HOLD — va qanday qilib signal ochiladi */
export function buildSignalExplainer(input: {
  horizon: "long" | "short";
  verdict: HorizonVerdict;
  gate: TradeGateResult | null;
  rawBias: "long" | "short" | "wait";
  marketQuality: MarketQuality;
  stabilityNoteUz?: string;
  tfAligned?: number;
  tfTotal?: number;
}): SignalExplainer {
  const { horizon, verdict, gate, rawBias, marketQuality } = input;
  const cfg = horizon === "short" ? SHORT_THRESHOLDS : LONG_THRESHOLDS;
  const horizonLabelUz = horizon === "short" ? "YAQIN" : "UZOQ";

  const rawBiasUz =
    rawBias === "long"
      ? "Texnik: LONG yo'nalish"
      : rawBias === "short"
        ? "Texnik: SHORT yo'nalish"
        : "Texnik: KUTISH (TF mos emas)";

  const blockers: SignalBlocker[] = [];

  blockers.push({
    id: "gate",
    labelUz: "Savdo darvozasi",
    ok: gate?.allowed ?? verdict.gateAllowed,
    detailUz: gate?.reasonUz?.slice(0, 100) ?? (verdict.gateAllowed ? "Ruxsat" : "Bloklangan"),
  });

  const passed = verdict.checklist.filter((c) => c.ok).length;
  blockers.push({
    id: "filters",
    labelUz: `Filterlar (${cfg.filterTotal})`,
    ok: passed >= cfg.minFilters,
    detailUz: `${passed}/${cfg.filterTotal} o'tdi`,
  });

  blockers.push({
    id: "news",
    labelUz: "Yangiliklar",
    ok: verdict.newsAligned || passed >= cfg.minFilters,
    detailUz: `${verdict.newsBias} ${verdict.newsStrength}%`,
  });

  blockers.push({
    id: "confluence",
    labelUz: "TF moslik",
    ok: passed >= cfg.minFilters || verdict.strength >= cfg.minStrength,
    detailUz: verdict.tfSummaryUz || "—",
  });

  blockers.push({
    id: "strength",
    labelUz: "Signal kuchi",
    ok: verdict.strength >= cfg.minStrength,
    detailUz: `${verdict.strength}% (min ${cfg.minStrength}%)`,
  });

  blockers.push({
    id: "market",
    labelUz: "Bozor sifati",
    ok: marketQuality.tradeable,
    detailUz: `${marketQuality.score}/100 — ${marketQuality.grade}`,
  });

  if (!marketQuality.tradeable && marketQuality.warningsUz[0]) {
    blockers.push({
      id: "calendar",
      labelUz: "Makro / feed",
      ok: false,
      detailUz: marketQuality.warningsUz[0],
    });
  }

  if (input.stabilityNoteUz && verdict.action === "HOLD" && rawBias !== "wait") {
    blockers.push({
      id: "stability",
      labelUz: "Barqarorlik",
      ok: false,
      detailUz: input.stabilityNoteUz,
    });
  }

  const okCount = blockers.filter((b) => b.ok).length;
  const readinessPct = Math.min(100, Math.round((okCount / blockers.length) * 100));

  const unlockUz = unlockHints(horizon, blockers, input.tfAligned, input.tfTotal);

  let coachUz: string;
  if (verdict.action === "BUY" || verdict.action === "SELL") {
    coachUz = `${verdict.action} — ${verdict.reliabilityUz}. Lot kichik, SL qo'lda o'zgartirmang.`;
  } else if (rawBias !== "wait") {
    coachUz = `Texnik ${rawBias.toUpperCase()} bor, lekin himoya HOLD qildi. ${unlockUz[0] ?? "Filterlarni kuzating"}.`;
  } else {
    coachUz = `Setup yo'q. ${unlockUz[0] ?? "TF va yangiliklar sinxron bo'lguncha kuting"}.`;
  }

  return {
    horizon,
    horizonLabelUz,
    action: verdict.action,
    rawBiasUz,
    readinessPct,
    blockers,
    unlockUz,
    coachUz,
  };
}
