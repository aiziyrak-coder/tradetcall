import type { Mt5BridgeStatus, Mt5TickPayload } from "../shared/mt5-types";
import { priceDataFromMt5Tick } from "../shared/mt5-price";
import type { PriceData } from "../shared/types";

const STALE_MS = Number(process.env.MT5_STALE_MS || 12_000);
const MIN_SPREAD = 0;
const MAX_SPREAD = 50;

let lastTick: Mt5TickPayload | null = null;
let lastPrice: PriceData | null = null;
let lastReceivedAt = 0;
let tickCount = 0;
let prevMid = 0;
let lastIngestError: string | null = null;

type TickListener = () => void;
const tickListeners = new Set<TickListener>();

function bridgeSecret(): string {
  return (process.env.MT5_BRIDGE_SECRET || "").trim();
}

export function isMt5BridgeEnabled(): boolean {
  return bridgeSecret().length >= 16;
}

export function onMt5Tick(listener: TickListener): () => void {
  tickListeners.add(listener);
  return () => tickListeners.delete(listener);
}

function notifyTickListeners(): void {
  for (const fn of tickListeners) {
    try {
      fn();
    } catch {
      /* listener */
    }
  }
}

export function ingestMt5Tick(
  body: Mt5TickPayload,
  secretHeader: string
): { ok: boolean; error?: string } {
  const secret = bridgeSecret();
  if (!secret) {
    lastIngestError = "MT5_BRIDGE_SECRET serverda o'rnatilmagan (min 16 belgi)";
    return { ok: false, error: lastIngestError };
  }
  if (secretHeader !== secret) {
    lastIngestError = "Noto'g'ri MT5 secret";
    return { ok: false, error: lastIngestError };
  }

  const bid = Number(body.bid);
  const ask = Number(body.ask);
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) {
    lastIngestError = "bid/ask noto'g'ri";
    return { ok: false, error: lastIngestError };
  }
  if (ask < bid) {
    lastIngestError = "ask < bid";
    return { ok: false, error: lastIngestError };
  }
  const spread = ask - bid;
  if (spread > MAX_SPREAD) {
    lastIngestError = "Spread juda keng";
    return { ok: false, error: lastIngestError };
  }

  const sym = (body.symbol || "XAUUSD").toUpperCase();
  if (!sym.includes("XAU") && !sym.includes("GOLD")) {
    lastIngestError = "Faqat XAUUSD/GOLD symbol";
    return { ok: false, error: lastIngestError };
  }

  const tick: Mt5TickPayload = {
    symbol: sym,
    bid,
    ask,
    time: body.time ?? Math.floor(Date.now() / 1000),
    broker: body.broker?.slice(0, 64),
    account: body.account?.slice(0, 32),
  };

  lastTick = tick;
  tickCount++;
  lastReceivedAt = Date.now();
  lastIngestError = null;

  const receivedIso = new Date(lastReceivedAt).toISOString();
  const pd = priceDataFromMt5Tick(tick, receivedIso);
  if (prevMid > 0) {
    pd.change = Math.round((pd.price - prevMid) * 1000) / 1000;
    pd.changePercent = Math.round((pd.change / prevMid) * 10000) / 100;
  }
  prevMid = pd.price;
  lastPrice = pd;
  notifyTickListeners();
  return { ok: true };
}

export function getMt5PriceData(): PriceData | null {
  if (!lastPrice || !lastTick || !lastReceivedAt) return null;
  const age = Date.now() - lastReceivedAt;
  if (age > STALE_MS) return null;
  return lastPrice;
}

export function getMt5BridgeStatus(): Mt5BridgeStatus {
  const enabled = isMt5BridgeEnabled();
  if (!lastTick || !lastPrice || !lastReceivedAt) {
    return {
      enabled,
      connected: false,
      stale: true,
      lastTickAt: null,
      symbol: null,
      broker: null,
      bid: null,
      ask: null,
      spread: null,
      tickCount,
      ageMs: null,
      lastError: lastIngestError,
      setupHintUz: enabled
        ? "MT5 EA yoki python_bridge ishga tushiring — tick kutilmoqda"
        : "Serverda MT5_BRIDGE_SECRET (min 16 belgi) o'rnating",
    };
  }
  const ageMs = Date.now() - lastReceivedAt;
  const stale = ageMs > STALE_MS;
  return {
    enabled,
    connected: !stale,
    stale,
    lastTickAt: lastPrice.timestamp,
    symbol: lastTick.symbol,
    broker: lastTick.broker ?? null,
    bid: lastPrice.bid ?? null,
    ask: lastPrice.ask ?? null,
    spread: lastPrice.spread ?? null,
    tickCount,
    ageMs,
    lastError: stale ? "Tick kechikdi — EA intervalini tekshiring" : lastIngestError,
    setupHintUz: stale
      ? `Oxirgi tick ${Math.round(ageMs / 1000)}s oldin — MT5 grafikda EA yoqilganmi?`
      : null,
  };
}
