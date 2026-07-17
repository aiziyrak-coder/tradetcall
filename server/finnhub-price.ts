/**
 * Ixtiyoriy Finnhub WebSocket narx feedi.
 * Kalit: FINNHUB_API_KEY (.env) — yo'q bo'lsa o'chirilgan (TradingView asosiy).
 *
 * Tavsiya: Finnhub free — 60 req/min + WS (forex). Polygon real-time pullik;
 * Twelve Data free — kechiktirilgan. Shuning uchun Finnhub eng mos.
 * Ro'yxat: https://finnhub.io/register
 */

import WebSocket from "ws";
import type { PriceData } from "../shared/types";

const FINNHUB_KEY = process.env.FINNHUB_API_KEY?.trim() ?? "";
const SYMBOL = process.env.FINNHUB_SYMBOL?.trim() || "OANDA:XAU_USD";
const STALE_MS = Number(process.env.FINNHUB_STALE_MS ?? 15_000);

let ws: WebSocket | null = null;
let lastPrice: PriceData | null = null;
let lastAt = 0;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = true;
const tickListeners = new Set<() => void>();

function buildPrice(p: number): PriceData {
  return {
    symbol: "XAUUSD",
    price: Math.round(p * 100) / 100,
    change: 0,
    changePercent: 0,
    timestamp: new Date().toISOString(),
    source: "Finnhub",
    feed: "finnhub",
  };
}

function scheduleReconnect() {
  if (stopped || !FINNHUB_KEY) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(reconnectAttempt, 5));
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => connect(), delay);
}

function connect() {
  if (stopped || !FINNHUB_KEY) return;
  try {
    ws = new WebSocket(`wss://ws.finnhub.io?token=${encodeURIComponent(FINNHUB_KEY)}`);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.on("open", () => {
    reconnectAttempt = 0;
    ws?.send(JSON.stringify({ type: "subscribe", symbol: SYMBOL }));
    console.log(`[finnhub] subscribed ${SYMBOL}`);
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as {
        type?: string;
        data?: { s?: string; p?: number; t?: number }[];
      };
      if (msg.type !== "trade" || !msg.data?.length) return;
      const trade = msg.data[msg.data.length - 1];
      if (!trade?.p || !Number.isFinite(trade.p)) return;
      lastPrice = buildPrice(trade.p);
      lastAt = Date.now();
      for (const fn of tickListeners) {
        try {
          fn();
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore parse */
    }
  });

  ws.on("close", () => {
    ws = null;
    scheduleReconnect();
  });

  ws.on("error", () => {
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
  });
}

export function isFinnhubConfigured(): boolean {
  return FINNHUB_KEY.length > 8;
}

export function startFinnhubPrice(): void {
  if (!isFinnhubConfigured()) return;
  stopped = false;
  connect();
}

export function stopFinnhubPrice(): void {
  stopped = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  try {
    ws?.close();
  } catch {
    /* ignore */
  }
  ws = null;
}

export function getFinnhubPrice(): PriceData | null {
  if (!lastPrice) return null;
  if (Date.now() - lastAt > STALE_MS) return null;
  return lastPrice;
}

export function isFinnhubPriceFresh(): boolean {
  return !!lastPrice && Date.now() - lastAt <= STALE_MS;
}

export function onFinnhubTick(fn: () => void): () => void {
  tickListeners.add(fn);
  return () => tickListeners.delete(fn);
}
