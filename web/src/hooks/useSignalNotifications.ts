import { useEffect, useRef } from "react";
import type { MonitorSnapshot } from "../../../shared/types";
import { loadTradePrefs } from "../lib/trade-prefs";
import { playTripleSignalAlert, showSignalNotification } from "../lib/notifications";

const LAST_KEY = "xauusd-last-ai-signal-notify";

function loadLast(): string {
  try {
    return sessionStorage.getItem(LAST_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveLast(v: string): void {
  sessionStorage.setItem(LAST_KEY, v);
}

export function useSignalNotifications(data: MonitorSnapshot | null): void {
  const lastRef = useRef(loadLast());

  useEffect(() => {
    if (!data) return;
    const prefs = loadTradePrefs();
    if (!prefs.notifyEnabled) return;

    const ai = data.aiSignal;
    if (!ai || data.aiPhase !== "ready") return;

    const action = ai.action;
    if (action !== "BUY" && action !== "SELL") {
      lastRef.current = `HOLD:${ai.createdAt}`;
      saveLast(lastRef.current);
      return;
    }

    if (ai.confidence < 55) {
      lastRef.current = `${action}:low`;
      saveLast(lastRef.current);
      return;
    }

    const sig = `${action}:${ai.createdAt}`;
    if (lastRef.current === sig) return;

    lastRef.current = sig;
    saveLast(sig);
    void playTripleSignalAlert(action);
    showSignalNotification(
      `XAUUSD AI — ${action}`,
      ai.triggerUz,
      `signal-ai-${action}-${ai.createdAt}`
    );
  }, [data?.aiSignal?.createdAt, data?.aiSignal?.action, data?.aiPhase]);
}
