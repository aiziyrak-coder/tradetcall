/** Tez narx harakati — kritik ko'tarilish/pasayish */

export interface PriceImpulse {
  direction: "long" | "short";
  moveUsd: number;
  windowSec: number;
}

const RING: { t: number; p: number }[] = [];
const MAX_AGE_MS = 90_000;

export function recordPriceSample(price: number): void {
  const now = Date.now();
  RING.push({ t: now, p: price });
  while (RING.length > 0 && now - RING[0].t > MAX_AGE_MS) RING.shift();
}

export function detectPriceImpulse(
  price: number,
  opts?: { minUsd?: number; windowMs?: number }
): PriceImpulse | null {
  recordPriceSample(price);
  const minUsd = opts?.minUsd ?? 1.2;
  const windowMs = opts?.windowMs ?? 45_000;
  const now = Date.now();
  const inWindow = RING.filter((s) => now - s.t <= windowMs);
  if (inWindow.length < 2) return null;
  const oldest = inWindow[0].p;
  const move = price - oldest;
  const abs = Math.abs(move);
  if (abs < minUsd) return null;
  return {
    direction: move > 0 ? "long" : "short",
    moveUsd: Math.round(abs * 1000) / 1000,
    windowSec: Math.round(windowMs / 1000),
  };
}

/** M1 skalp — qisqa oyna, kichik harakat */
export function detectScalpImpulse(price: number): PriceImpulse | null {
  return detectPriceImpulse(price, { minUsd: 0.4, windowMs: 22_000 });
}

export function resetPriceImpulseRing(): void {
  RING.length = 0;
}
