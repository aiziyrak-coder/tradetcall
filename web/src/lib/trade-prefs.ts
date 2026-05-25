export interface TradePrefs {
  accountUsd: number;
  riskPercent: number;
  notifyEnabled: boolean;
}

const KEY = "xauusd-trade-prefs";

const defaults: TradePrefs = {
  accountUsd: 1000,
  riskPercent: 1,
  notifyEnabled: true,
};

export function loadTradePrefs(): TradePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveTradePrefs(prefs: Partial<TradePrefs>): TradePrefs {
  const next = { ...loadTradePrefs(), ...prefs };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
