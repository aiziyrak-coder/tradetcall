import { useEffect, useRef } from "react";
import type { MonitorSnapshot } from "../../../shared/types";
import { buildTradePlan } from "../../../shared/trade-plan";
import { loadTradePrefs } from "../lib/trade-prefs";
import { showSignalNotification } from "../lib/notifications";

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

export function useSignalNotifications(data: MonitorSnapshot | null): void {
  const lastRef = useRef<LastNotify>(loadLast());

  useEffect(() => {
    if (!data) return;
    const prefs = loadTradePrefs();
    if (!prefs.notifyEnabled) return;

    const shortV = data.shortStrategy?.verdict;
    const longV = data.strategy?.verdict;
    if (!shortV && !longV) return;

    const checks: { key: "short" | "long"; label: string; action: string; trusted: boolean; body: string }[] =
      [];

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
      const trusted = plan.trusted && (shortV.action === "BUY" || shortV.action === "SELL");
      checks.push({
        key: "short",
        label: "YAQIN",
        action: shortV.action,
        trusted,
        body: plan.summaryUz,
      });
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
      checks.push({
        key: "long",
        label: "UZOQ",
        action: longV.action,
        trusted,
        body: plan.summaryUz,
      });
    }

    for (const c of checks) {
      const prev = lastRef.current[c.key];
      const sig = `${c.action}:${c.trusted}`;
      if (!c.trusted || c.action === "HOLD") {
        lastRef.current[c.key] = sig;
        saveLast(lastRef.current);
        continue;
      }
      if (prev === sig) continue;

      lastRef.current[c.key] = sig;
      saveLast(lastRef.current);

      showSignalNotification(
        `XAUUSD ${c.label} — ${c.action}`,
        c.body,
        `signal-${c.key}-${c.action}`
      );
    }
  }, [data?.timestamp, data?.shortStrategy?.verdict?.action, data?.strategy?.verdict?.action]);
}
