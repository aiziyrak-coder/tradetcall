/** AI bir martalik savdo signali — YAQIN/UZOQ yo'q */

export type AiTradeAction = "BUY" | "SELL" | "HOLD";

export type AiPhase = "idle" | "analyzing" | "ready" | "error";

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
}

export function isAiTradeAction(v: string): v is AiTradeAction {
  return v === "BUY" || v === "SELL" || v === "HOLD";
}
