/** AI bir martalik savdo signali — YAQIN/UZOQ yo'q */

export type AiTradeAction = "BUY" | "SELL" | "HOLD";

export type AiPhase = "idle" | "analyzing" | "ready" | "error";

/** Signal rejimi: tez skalping yoki 1–2 soatlik swing */
export type SignalMode = "scalp" | "swing";

export interface AiTradeSignal {
  action: AiTradeAction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  riskReward: number;
  currentPrice: number;
  analysisUz: string;
  triggerUz: string;
  invalidationUz: string;
  summaryUz: string;
  createdAt: string;
  /** Bashorat diapazoni */
  forecastHigh?: number;
  forecastLow?: number;
  forecastBiasUz?: string;
  targetMoveUsd?: number;
  /** Yutish ehtimoli 35–88% */
  winProbability?: number;
  /** Moslik 0–100 */
  confluencePct?: number;
  /** A+ / A / B / C / D */
  signalGrade?: string;
  /** Treyder paneli xulosasi */
  panelUz?: string;
  /** Signal rejimi — scalp (tez) yoki swing (uzoq) */
  mode?: SignalMode;
  /** Rejim yorlig'i, masalan "TEZ SAVDO" yoki "1–2 SOAT" */
  modeLabelUz?: string;
  /** Taxminiy ushlab turish vaqti */
  holdTimeUz?: string;
  /** Signal asosini tashkil qilgan eng kuchli indikatorlar (confluence) */
  indicatorsUz?: string[];
}

export function isAiTradeAction(v: string): v is AiTradeAction {
  return v === "BUY" || v === "SELL" || v === "HOLD";
}
