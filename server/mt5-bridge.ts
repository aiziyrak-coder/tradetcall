import type { Mt5BridgeStatus, Mt5TickPayload } from "../shared/mt5-types";
import { priceDataFromMt5Tick } from "../shared/mt5-price";
import type { PriceData } from "../shared/types";

const STALE_MS = Number(process.env.MT5_STALE_MS || 8000);
const MIN_SPREAD = 0;
const MAX_SPREAD = 50;

let lastTick: Mt5TickPayload | null = null;
let lastPrice: PriceData | null = null;
let tickCount = 0;
let prevMid = 0;

function bridgeSecret(): string {
  return (process.env.MT5_BRIDGE_SECRET || "").trim();
}

export function isMt5BridgeEnabled(): boolean {
  return bridgeSecret().length >= 16;
}

export function ingestMt5Tick(
  body: Mt5TickPayload,
  secretHeader: string
): { ok: boolean; error?: string } {
  const secret = bridgeSecret();
  if (!secret) {
    return { ok: false, error: "MT5_BRIDGE_SECRET serverda o'rnatilmagan" };
  }
  if (secretHeader !== secret) {
    return { ok: false, error: "Noto'g'ri MT5 secret" };
  }

  const bid = Number(body.bid);
  const ask = Number(body.ask);
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) {
    return { ok: false, error: "bid/ask noto'g'ri" };
  }
  if (ask < bid) {
    return { ok: false, error: "ask < bid" };
  }
  const spread = ask - bid;
  if (spread > MAX_SPREAD) {
    return { ok: false, error: "Spread juda keng" };
  }

  const sym = (body.symbol || "XAUUSD").toUpperCase();
  if (!sym.includes("XAU") && !sym.includes("GOLD")) {
    return { ok: false, error: "Faqat XAUUSD/GOLD symbol" };
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
  const pd = priceDataFromMt5Tick(tick);
  if (prevMid > 0) {
    pd.change = Math.round((pd.price - prevMid) * 100) / 100;
    pd.changePercent = Math.round((pd.change / prevMid) * 10000) / 100;
  }
  prevMid = pd.price;
  lastPrice = pd;
  return { ok: true };
}

export function getMt5PriceData(): PriceData | null {
  if (!lastPrice || !lastTick) return null;
  const age = Date.now() - new Date(lastPrice.timestamp).getTime();
  if (age > STALE_MS) return null;
  return lastPrice;
}

export function getMt5BridgeStatus(): Mt5BridgeStatus {
  if (!lastTick || !lastPrice) {
    return {
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
    };
  }
  const ageMs = Date.now() - new Date(lastPrice.timestamp).getTime();
  const stale = ageMs > STALE_MS;
  return {
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
  };
}
