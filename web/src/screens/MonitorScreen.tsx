import { useEffect, useMemo, useState } from "react";
import type { LongTermForecast, MonitorSnapshot } from "../../../shared/types";
import { GoldChart, type ChartPriceLevels } from "../components/gold/GoldChart";
import { MonitorTopBar } from "../components/monitor/MonitorTopBar";
import { NewsAnalysisStrip } from "../components/monitor/NewsAnalysisStrip";
import { NewsColumn } from "../components/monitor/NewsColumn";
import { ShortStrategyPanelCompact } from "../components/monitor/ShortStrategyPanelCompact";
import { StrategyPanelCompact } from "../components/monitor/StrategyPanelCompact";
import { api, connectMonitor } from "../lib/api";
import { UZ } from "../lib/uz";

interface Props {
  username: string;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
}

export function MonitorScreen({
  username,
  isAdmin,
  onOpenAdmin,
  onOpenSettings,
  onLogout,
}: Props) {
  const [data, setData] = useState<MonitorSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("—");
  const [chartInterval, setChartInterval] = useState("5m");
  const [forecast, setForecast] = useState<LongTermForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [analyzingNews, setAnalyzingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    void api.status().then((r) => setHasApiKey(r.hasKey));

    void api.monitor
      .getSnapshot()
      .then((s) => {
        setData(s);
        setChartInterval(s.chart?.interval ?? "5m");
        setLastUpdate(new Date(s.timestamp).toLocaleTimeString("uz-UZ"));
        setOnline(s.online);
        setReady(true);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Yuklash xatosi");
        setReady(true);
      });

    const disconnect = connectMonitor({
      onUpdate: (s) => {
        setData(s);
        setLastUpdate(new Date(s.timestamp).toLocaleTimeString("uz-UZ"));
        setOnline(s.online);
        setReady(true);
      },
      onError: (e) => setError(e.message),
      onTranslating: setTranslating,
      onAnalyzingNews: setAnalyzingNews,
    });

    return disconnect;
  }, []);

  const handleIntervalChange = async (iv: "1m" | "5m" | "15m" | "1h") => {
    setChartInterval(iv);
    setError(null);
    try {
      const chart = await api.monitor.setChartInterval(iv);
      setData((prev) => (prev ? { ...prev, chart } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Grafik xatosi");
    }
  };

  const price = data?.gold?.price ?? 0;
  const short = data?.shortStrategy;
  const long = data?.strategy;

  const chartLevels: ChartPriceLevels | undefined = useMemo(() => {
    const sig = short?.signal;
    if (!sig) return undefined;
    return {
      entry: sig.entryPrice,
      entryFrom: sig.entryFrom,
      entryTo: sig.entryTo,
      sl: sig.stopLoss,
      tp: sig.takeProfit,
    };
  }, [short?.signal]);

  const news = data?.news ?? { direct: [], macro: [], geopolitics: [] };

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--term-bg)] text-[11px] text-[var(--term-muted)]">
        Terminal yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="monitor-root monitor-compact relative flex flex-col overflow-hidden bg-[var(--term-bg)]">
      <MonitorTopBar
        gold={data?.gold ?? null}
        strategy={long ?? null}
        shortStrategy={short ?? null}
        drivers={data?.drivers ?? []}
        username={username}
        lastUpdate={lastUpdate}
        online={online}
        priceStale={data?.priceStale}
        feedError={data?.feedError}
        translating={translating || analyzingNews}
        isAdmin={isAdmin}
        onOpenAdmin={onOpenAdmin}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
      />

      {error && (
        <div className="shrink-0 bg-red-950/60 px-2 py-0.5 text-center text-[9px] text-[var(--term-red)]">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>
            yopish
          </button>
        </div>
      )}

      <div
        className="grid min-h-0 flex-1 gap-1 p-1"
        style={{
          gridTemplateColumns: "minmax(200px, 22%) minmax(0, 1fr) minmax(200px, 22%)",
          gridTemplateRows: "minmax(0, 1fr) 54px 40px",
          gridTemplateAreas: `
            "long chart short"
            "analysis analysis analysis"
            "news news news"
          `,
        }}
      >
        <div style={{ gridArea: "long" }} className="min-h-0 overflow-hidden">
          <StrategyPanelCompact
            strategy={long ?? null}
            forecast={forecast}
            forecastLoading={forecastLoading}
            hasApiKey={hasApiKey}
            currentPrice={price}
            newsAnalysis={data?.newsAnalysis ?? null}
            onForecast={async () => {
              setForecastLoading(true);
              setError(null);
              try {
                setForecast(await api.monitor.forecast());
              } catch (e) {
                setError(e instanceof Error ? e.message : "Strategiya xatosi");
              } finally {
                setForecastLoading(false);
              }
            }}
          />
        </div>

        <div style={{ gridArea: "chart" }} className="min-h-0 overflow-hidden rounded-md border border-[var(--term-border)]">
          <GoldChart
            key={chartInterval}
            candles={data?.chart?.candles ?? []}
            interval={chartInterval}
            onIntervalChange={handleIntervalChange}
            levels={chartLevels}
          />
        </div>

        <div style={{ gridArea: "short" }} className="min-h-0 overflow-hidden">
          <ShortStrategyPanelCompact
            strategy={short ?? null}
            currentPrice={price}
            newsAnalysis={data?.newsAnalysis ?? null}
          />
        </div>

        <div
          style={{ gridArea: "analysis" }}
          className="min-h-0 overflow-hidden rounded-md border border-cyan-500/30 bg-[var(--term-panel)]"
        >
          <NewsAnalysisStrip
            analysis={data?.newsAnalysis ?? null}
            analyzing={analyzingNews}
            hasApiKey={hasApiKey}
            onDeepAnalysis={async () => {
              setAnalyzingNews(true);
              setError(null);
              try {
                await api.monitor.deepNewsAnalysis();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Yangilik tahlili xatosi");
              } finally {
                setAnalyzingNews(false);
              }
            }}
          />
        </div>

        <div
          style={{ gridArea: "news" }}
          className="grid min-h-0 grid-cols-3 gap-0 overflow-hidden rounded-md border border-[var(--term-border)] bg-[var(--term-panel)]"
        >
          <NewsColumn
            title={UZ.streams.direct}
            icon="🥇"
            items={news.direct}
            accent="text-[var(--term-gold)]"
            highlight
            compact
            maxItems={3}
          />
          <NewsColumn
            title={UZ.streams.macro}
            icon="📊"
            items={news.macro}
            accent="text-[var(--term-green)]"
            compact
            maxItems={3}
          />
          <NewsColumn
            title={UZ.streams.geopolitics}
            icon="🌍"
            items={news.geopolitics}
            accent="text-[var(--term-red)]"
            compact
            maxItems={3}
          />
        </div>
      </div>
    </div>
  );
}
