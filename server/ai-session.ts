import type { MonitorSessionInfo } from "../shared/types";

/** AI (Anthropic) token sarflanadigan rejim — default 30 daqiqa */
const AI_SESSION_MS = Number(process.env.AI_SESSION_MS || 30 * 60 * 1000);
const AUTO_STOP_MINUTES = Math.max(1, Math.round(AI_SESSION_MS / 60_000));

let aiActive = false;
let aiEndsAt = 0;
let aiTimer: ReturnType<typeof setTimeout> | null = null;
let onSessionChange: ((status: MonitorSessionInfo) => void) | null = null;

export function setAiSessionChangeHandler(fn: (status: MonitorSessionInfo) => void): void {
  onSessionChange = fn;
}

function notifyChange(): void {
  const status = getAiSessionStatus();
  onSessionChange?.(status);
}

export function getAiSessionStatus(): MonitorSessionInfo {
  const remaining = aiActive ? Math.max(0, aiEndsAt - Date.now()) : 0;
  return {
    active: aiActive,
    endsAt: aiActive ? new Date(aiEndsAt).toISOString() : null,
    remainingMs: remaining,
    autoStopMinutes: AUTO_STOP_MINUTES,
  };
}

export function isAiSessionActive(): boolean {
  return aiActive;
}

export function startAiSession(): MonitorSessionInfo {
  if (aiTimer) clearTimeout(aiTimer);
  aiActive = true;
  aiEndsAt = Date.now() + AI_SESSION_MS;
  aiTimer = setTimeout(() => stopAiSession("auto"), AI_SESSION_MS);
  if (aiTimer && typeof aiTimer.unref === "function") aiTimer.unref();
  notifyChange();
  return getAiSessionStatus();
}

export function stopAiSession(_reason: "user" | "auto" = "user"): MonitorSessionInfo {
  aiActive = false;
  aiEndsAt = 0;
  if (aiTimer) clearTimeout(aiTimer);
  aiTimer = null;
  notifyChange();
  return getAiSessionStatus();
}
