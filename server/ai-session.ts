import type { AiPhase, AiTradeSignal, SignalMode } from "../shared/ai-trade-signal";
import type { MonitorSessionInfo } from "../shared/types";

let phase: AiPhase = "idle";
let messageUz = "YANGI PROGNOZ tugmasini bosing — bir martalik AI signal";
let aiSignal: AiTradeSignal | null = null;
let onSessionChange: ((status: MonitorSessionInfo) => void) | null = null;
let analysisRunner: ((mode: SignalMode) => Promise<void>) | null = null;

export function setAiAnalysisRunner(fn: (mode: SignalMode) => Promise<void>): void {
  analysisRunner = fn;
}

export function setAiSessionChangeHandler(fn: (status: MonitorSessionInfo) => void): void {
  onSessionChange = fn;
}

export function getAiPhase(): AiPhase {
  return phase;
}

export function getAiSignal(): AiTradeSignal | null {
  return aiSignal;
}

export function getAiMessageUz(): string {
  return messageUz;
}

function notifyChange(): void {
  onSessionChange?.(getAiSessionStatus());
}

export function getAiSessionStatus(): MonitorSessionInfo {
  return {
    active: phase === "analyzing",
    phase,
    messageUz,
    endsAt: null,
    remainingMs: 0,
    autoStopMinutes: 0,
  };
}

export function isAiSessionActive(): boolean {
  return phase === "analyzing";
}

/** Eski API — faqat tahlil ishlayotganda */
export function isAiAnalysisReady(): boolean {
  return phase === "ready" && aiSignal != null;
}

let analysisInFlight = false;

export function startAiSession(mode: SignalMode = "swing"): MonitorSessionInfo {
  if (phase === "analyzing" || analysisInFlight) return getAiSessionStatus();

  analysisInFlight = true;
  phase = "analyzing";
  messageUz =
    mode === "scalp"
      ? "Tez savdo signali tahlil qilinmoqda — jonli momentum, M1…"
      : "1–2 soatlik signal tahlil qilinmoqda — yangiliklar, indikatorlar…";
  aiSignal = null;
  notifyChange();

  if (analysisRunner) {
    void analysisRunner(mode)
      .catch((e) => {
        phase = "error";
        messageUz = e instanceof Error ? e.message : "AI tahlil xatosi";
        notifyChange();
      })
      .finally(() => {
        analysisInFlight = false;
      });
  } else {
    analysisInFlight = false;
    phase = "error";
    messageUz = "AI runner ulanmagan — serverni qayta ishga tushiring";
    notifyChange();
  }

  return getAiSessionStatus();
}

export function completeAiSession(signal: AiTradeSignal): MonitorSessionInfo {
  aiSignal = signal;
  phase = "ready";
  messageUz = `AI tahlil tayyor — ${signal.action} · kirish $${signal.entry}`;
  notifyChange();
  return getAiSessionStatus();
}

export function failAiSession(errorUz: string): MonitorSessionInfo {
  phase = "error";
  messageUz = errorUz.slice(0, 200);
  aiSignal = null;
  notifyChange();
  return getAiSessionStatus();
}

export function stopAiSession(_reason: "user" | "auto" = "user"): MonitorSessionInfo {
  phase = "idle";
  messageUz = "YANGI PROGNOZ tugmasini bosing — bir martalik AI signal";
  aiSignal = null;
  notifyChange();
  return getAiSessionStatus();
}
