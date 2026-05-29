/** Oltin narxi — broker bilan 0.001 (tiyin) aniqlik */
export function roundGoldPrice(n: number): number {
  return Math.round(n * 1000) / 1000;
}
