declare module "technicalindicators" {
  export const RSI: { calculate: (input: { period: number; values: number[] }) => number[] };
  export const SMA: { calculate: (input: { period: number; values: number[] }) => number[] };
  export const ADX: {
    calculate: (input: {
      period: number;
      high: number[];
      low: number[];
      close: number[];
    }) => { adx: number; pdi: number; mdi: number }[];
  };
  export const ROC: { calculate: (input: { period: number; values: number[] }) => number[] };
}
