import type { PriceData } from "../shared/types";

/** TradingView default XAUUSD = OANDA (https://www.tradingview.com/symbols/XAUUSD/) */
const TV_SYMBOL = (process.env.TRADINGVIEW_SYMBOL || "OANDA:XAUUSD").trim();
const STALE_MS = Number(process.env.TRADINGVIEW_STALE_MS || 12_000);

let latest: PriceData | null = null;
let lastAt = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;
let streamClose: (() => void) | null = null;
let bootPromise: Promise<void> | null = null;
const tickListeners = new Set<() => void>();

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function applyQuote(raw: Record<string, number | null | undefined>): void {
  const lp = raw.lp;
  if (lp == null || !Number.isFinite(lp) || lp < 100) return;

  const bid = raw.bid != null && Number.isFinite(raw.bid) ? round3(raw.bid) : undefined;
  const ask = raw.ask != null && Number.isFinite(raw.ask) ? round3(raw.ask) : undefined;
  const price = round3(lp);
  const ch = raw.ch != null && Number.isFinite(raw.ch) ? round3(raw.ch) : 0;
  const chp =
    raw.chp != null && Number.isFinite(raw.chp) ? Math.round(raw.chp * 100) / 100 : 0;

  const spread =
    bid != null && ask != null ? Math.round((ask - bid) * 1000) / 1000 : undefined;

  latest = {
    symbol: "XAUUSD",
    price,
    change: ch,
    changePercent: chp,
    high24h:
      raw.high_price != null && Number.isFinite(raw.high_price)
        ? round3(raw.high_price)
        : latest?.high24h,
    low24h:
      raw.low_price != null && Number.isFinite(raw.low_price)
        ? round3(raw.low_price)
        : latest?.low24h,
    timestamp: new Date().toISOString(),
    source: `TradingView ${TV_SYMBOL}`,
    feed: "tradingview",
    bid,
    ask,
    spread,
  };
  lastAt = Date.now();
  for (const fn of tickListeners) {
    try {
      fn();
    } catch {
      /* */
    }
  }
}

export function getTradingViewSymbol(): string {
  return TV_SYMBOL;
}

export function isTradingViewPriceFresh(): boolean {
  return latest != null && Date.now() - lastAt < STALE_MS;
}

export function getTradingViewPrice(): PriceData | null {
  if (!isTradingViewPriceFresh()) return null;
  return latest;
}

export function onTradingViewTick(listener: () => void): () => void {
  tickListeners.add(listener);
  return () => tickListeners.delete(listener);
}

export async function startTradingViewPriceStream(): Promise<void> {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    try {
      const { tv } = await import("tradingview-api-adapter");
      client = tv();
      const sym = client.symbol(TV_SYMBOL);

      const initial = await sym.price();
      if (typeof initial === "number" && initial > 100) {
        applyQuote({ lp: initial });
      }

      const stream = sym.stream([
        "lp",
        "bid",
        "ask",
        "ch",
        "chp",
        "high_price",
        "low_price",
        "prev_close_price",
      ]);

      void (async () => {
        try {
          for await (const { data } of stream) {
            applyQuote(data as Record<string, number | null | undefined>);
          }
        } catch (e) {
          console.error("[tradingview-price] stream ended:", e);
        }
      })();

      if (typeof stream.close === "function") {
        streamClose = () => stream.close();
      }

      console.log(`[tradingview-price] ${TV_SYMBOL} — TradingView bilan bir xil narx`);
    } catch (e) {
      console.error("[tradingview-price] start failed:", e);
      bootPromise = null;
    }
  })();

  return bootPromise;
}

export async function stopTradingViewPriceStream(): Promise<void> {
  if (streamClose) {
    streamClose();
    streamClose = null;
  }
  if (client) {
    try {
      await client.disconnect();
    } catch {
      /* */
    }
    client = null;
  }
  bootPromise = null;
  latest = null;
  lastAt = 0;
}
