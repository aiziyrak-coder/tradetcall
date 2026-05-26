import {
  DEFAULT_CAPITAL_SHIELD,
  type CapitalShieldPrefs,
} from "../../../shared/capital-shield";

export interface TradePrefs {
  accountUsd: number;
  riskPercent: number;
  notifyEnabled: boolean;
  capitalShield: CapitalShieldPrefs;
}

const KEY = "xauusd-trade-prefs";

const defaults: TradePrefs = {
  accountUsd: 1000,
  riskPercent: 1,
  notifyEnabled: true,
  capitalShield: { ...DEFAULT_CAPITAL_SHIELD },
};

export function loadTradePrefs(): TradePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults, capitalShield: { ...DEFAULT_CAPITAL_SHIELD } };
    const parsed = JSON.parse(raw) as Partial<TradePrefs>;
    return {
      ...defaults,
      ...parsed,
      capitalShield: { ...DEFAULT_CAPITAL_SHIELD, ...parsed.capitalShield },
    };
  } catch {
    return { ...defaults, capitalShield: { ...DEFAULT_CAPITAL_SHIELD } };
  }
}

export function saveTradePrefs(prefs: Partial<TradePrefs>): TradePrefs {
  const next = {
    ...loadTradePrefs(),
    ...prefs,
    capitalShield: prefs.capitalShield
      ? { ...loadTradePrefs().capitalShield, ...prefs.capitalShield }
      : loadTradePrefs().capitalShield,
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
