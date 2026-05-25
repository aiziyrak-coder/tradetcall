import { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  ColorType,
} from "lightweight-charts";
import type { Candle } from "../../../../shared/types";
import { UZ } from "../../lib/uz";

type Interval = "1m" | "5m" | "15m" | "1h";

interface Props {
  candles: Candle[];
  interval: string;
  onIntervalChange: (interval: Interval) => void;
}

const INTERVALS: Interval[] = ["1m", "5m", "15m", "1h"];

function toBar(c: Candle): CandlestickData {
  return {
    time: c.time as CandlestickData["time"],
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  };
}

export function GoldChart({ candles, interval, onIntervalChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastLenRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const lastCloseRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f1623" },
        textColor: "#cbd5e1",
        fontSize: 11,
        fontFamily: "Inter, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.12)" },
        horzLines: { color: "rgba(148, 163, 184, 0.12)" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "rgba(251, 191, 36, 0.35)" },
      timeScale: {
        borderColor: "rgba(251, 191, 36, 0.35)",
        timeVisible: true,
        secondsVisible: interval === "1m",
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#4ade80",
      downColor: "#f87171",
      borderUpColor: "#4ade80",
      borderDownColor: "#f87171",
      wickUpColor: "#86efac",
      wickDownColor: "#fca5a5",
    });

    chartRef.current = chart;
    seriesRef.current = series;
    lastLenRef.current = 0;
    lastTimeRef.current = null;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    if (containerRef.current) {
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      chart.applyOptions({
        timeScale: { secondsVisible: interval === "1m" },
      });
    }
  }, [interval]);

  useEffect(() => {
    lastLenRef.current = 0;
    lastTimeRef.current = null;
  }, [interval]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series) return;

    if (candles.length === 0) {
      series.setData([]);
      return;
    }

    const last = candles[candles.length - 1];
    const bar = toBar(last);

    const sameBar =
      lastLenRef.current === candles.length && lastTimeRef.current === last.time;
    const newBarAppended =
      lastLenRef.current > 0 &&
      candles.length === lastLenRef.current + 1 &&
      lastTimeRef.current !== null &&
      last.time > lastTimeRef.current;

    if (sameBar) {
      series.update(bar);
      lastCloseRef.current = last.close;
    } else if (newBarAppended) {
      series.update(bar);
      lastLenRef.current = candles.length;
      lastTimeRef.current = last.time;
      lastCloseRef.current = last.close;
    } else {
      series.setData(candles.map(toBar));
      chart?.timeScale().fitContent();
      lastLenRef.current = candles.length;
      lastTimeRef.current = last.time;
      lastCloseRef.current = last.close;
    }
  }, [candles]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--term-panel)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--term-border)] px-2 py-0.5">
        <span className="text-[9px] font-bold tracking-wide text-[var(--term-gold)]">{UZ.chart.title}</span>
        <div className="flex gap-0.5">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              type="button"
              onClick={() => onIntervalChange(iv)}
              className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                interval === iv
                  ? "bg-[var(--term-gold)] text-black shadow"
                  : "bg-[var(--term-panel-2)] text-[var(--term-muted)] hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 w-full">
        <div ref={containerRef} className="absolute inset-0" />
        {candles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-[var(--term-muted)]">
            Grafik yuklanmoqda…
          </div>
        )}
      </div>
    </div>
  );
}
