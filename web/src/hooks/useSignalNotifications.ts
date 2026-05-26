import { useEffect, useRef } from "react";
import type { MonitorSnapshot } from "../../../shared/types";
import { buildTradePlan } from "../../../shared/trade-plan";
import { loadTradePrefs } from "../lib/trade-prefs";
import { playTripleSignalAlert, showSignalNotification } from "../lib/notifications";

const LAST_KEY = "xauusd-last-signal-notify";

interface LastNotify {
  short: string;
  long: string;
}

function loadLast(): LastNotify {
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    if (raw) return JSON.parse(raw) as LastNotify;
  } catch {
    /* */
  }
  return { short: "", long: "" };
}

function saveLast(v: LastNotify): void {
  sessionStorage.setItem(LAST_KEY, JSON.stringify(v));
}

function prevAction(stored: string): string {
  const i = stored.indexOf(":");
  return i >= 0 ? stored.slice(0, i) : stored;
}

export function useSignalNotifications(data: MonitorSnapshot | null): void {
  const lastRef = useRef<LastNotify>(loadLast());

  useEffect(() => {
    if (!data) return;
    const prefs = loadTradePrefs();
    if (!prefs.notifyEnabled) return;

    const shortV = data.shortStrategy?.verdict;
    const longV = data.strategy?.verdict;
    if (!shortV && !longV) return;

    if (shortV && data.shortStrategy?.signal) {
      const plan = buildTradePlan({
        horizon: "short",
        horizonLabelUz: "YAQIN",
        verdict: shortV,
        signal: data.shortStrategy.signal,
        accountUsd: prefs.accountUsd,
        riskPercent: prefs.riskPercent,
        maxHoldMinutes: data.shortStrategy.maxHoldMinutes ?? 30,
      });

      const action = shortV.action;
      const prev = prevAction(lastRef.current.short);
      const sig = `${action}:${shortV.strength}`;

      if (action === "HOLD") {
        lastRef.current.short = sig;
        saveLast(lastRef.current);
      } else if ((action === "BUY" || action === "SELL") && prev !== action) {
        lastRef.current.short = sig;
        saveLast(lastRef.current);
        void playTripleSignalAlert(action);
        showSignalNotification(
          `XAUUSD YAQIN — ${action}`,
          plan.summaryUz,
          `signal-short-${action}`
        );
      }
    }

    if (longV && data.strategy?.signal) {
      const plan = buildTradePlan({
        horizon: "long",
        horizonLabelUz: "UZOQ",
        verdict: longV,
        signal: data.strategy.signal,
        accountUsd: prefs.accountUsd,
        riskPercent: prefs.riskPercent,
      });
      const trusted = plan.trusted && (longV.action === "BUY" || longV.action === "SELL");
      const action = longV.action;
      const prev = prevAction(lastRef.current.long);
      const sig = `${action}:${trusted}`;

      if (!trusted || action === "HOLD") {
        lastRef.current.long = sig;
        saveLast(lastRef.current);
      } else if (prev !== action) {
        lastRef.current.long = sig;
        saveLast(lastRef.current);
        void playTripleSignalAlert(action);
        showSignalNotification(
          `XAUUSD UZOQ — ${action}`,
          plan.summaryUz,
          `signal-long-${action}`
        );
      }
    }
  }, [
    data?.timestamp,
    data?.shortStrategy?.verdict?.action,
    data?.shortStrategy?.verdict?.strength,
    data?.strategy?.verdict?.action,
  ]);
}
