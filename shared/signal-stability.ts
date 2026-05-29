import type { TradeAction } from "./horizon-verdict";

export interface SignalStabilityState {
  stable: TradeAction;
  stableSince: number;
  lastFlipAt: number;
  pending: TradeAction | null;
  pendingSince: number;
}

const SHORT_HOLD_MS = 22 * 1000;
const SHORT_CONFIRM_MS = 2 * 1000;
const LONG_HOLD_MS = 7 * 60 * 1000;
const LONG_CONFIRM_MS = 18 * 1000;

export function createSignalStabilityState(): SignalStabilityState {
  return {
    stable: "HOLD",
    stableSince: Date.now(),
    lastFlipAt: 0,
    pending: null,
    pendingSince: 0,
  };
}

function isOpposite(a: TradeAction, b: TradeAction): boolean {
  return (a === "BUY" && b === "SELL") || (a === "SELL" && b === "BUY");
}

/** BUY↔SELL tez almashinishni oldini oladi — barqaror ko'rsatish */
export function stabilizeTradeAction(
  state: SignalStabilityState,
  raw: TradeAction,
  horizon: "long" | "short"
): { state: SignalStabilityState; action: TradeAction; noteUz: string } {
  const now = Date.now();
  const holdMs = horizon === "short" ? SHORT_HOLD_MS : LONG_HOLD_MS;
  const confirmMs = horizon === "short" ? SHORT_CONFIRM_MS : LONG_CONFIRM_MS;
  const next = { ...state };

  if (raw === "HOLD") {
    next.pending = null;
    if (next.stable !== "HOLD" && now - next.stableSince >= holdMs) {
      next.stable = "HOLD";
      next.stableSince = now;
      return {
        state: next,
        action: "HOLD",
        noteUz: "Signal tugadi — kutiling",
      };
    }
    if (next.stable !== "HOLD") {
      return {
        state: next,
        action: next.stable,
        noteUz: `Signal ushlangan (${Math.ceil((holdMs - (now - next.stableSince)) / 1000)}s)`,
      };
    }
    return { state: next, action: "HOLD", noteUz: "Hozir setup yo'q" };
  }

  if (next.stable === "HOLD") {
    next.stable = raw;
    next.stableSince = now;
    next.lastFlipAt = now;
    next.pending = null;
    return {
      state: next,
      action: raw,
      noteUz: "Yangi aniq signal",
    };
  }

  if (next.stable === raw) {
    next.pending = null;
    next.stableSince = now;
    return {
      state: next,
      action: raw,
      noteUz: "Signal davom etmoqda",
    };
  }

  if (!isOpposite(next.stable, raw)) {
    next.stable = raw;
    next.stableSince = now;
    return { state: next, action: raw, noteUz: "Signal yangilandi" };
  }

  const heldEnough = now - next.stableSince >= holdMs;
  if (!heldEnough) {
    next.pending = raw;
    next.pendingSince = now;
    return {
      state: next,
      action: next.stable,
      noteUz: `Yo'nalish qulflangan — ${raw} uchun kuting`,
    };
  }

  if (next.pending !== raw) {
    next.pending = raw;
    next.pendingSince = now;
    return {
      state: next,
      action: next.stable,
      noteUz: `${raw} tasdiqlanmoqda…`,
    };
  }

  if (now - next.pendingSince < confirmMs) {
    return {
      state: next,
      action: next.stable,
      noteUz: `${raw} tekshirilmoqda (${Math.ceil((confirmMs - (now - next.pendingSince)) / 1000)}s)`,
    };
  }

  next.stable = raw;
  next.stableSince = now;
  next.lastFlipAt = now;
  next.pending = null;
  return {
    state: next,
    action: raw,
    noteUz: `${raw} tasdiqlandi — eski signal bekor`,
  };
}
