import { useEffect, useState } from "react";
import type { LongTermForecast, MonitorSnapshot } from "../../../shared/types";
import { GoldChart } from "../components/gold/GoldChart";
import { IntelligenceHub } from "../components/monitor/IntelligenceHub";
import { MonitorTopBar } from "../components/monitor/MonitorTopBar";
import { NewsColumn } from "../components/monitor/NewsColumn";
import { StrategiesStackPanel } from "../components/monitor/StrategiesStackPanel";
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
  const [tickFlash, setTickFlash] = useState(0);
  const [chartInterval, setChartInterval] = useState("5m");
  const [forecast, setForecast] = useState<LongTermForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [analyzingNews, setAnalyzingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [wsLive, setWsLive] = useState(false);

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
        setWsLive(true);
        setTickFlash((n) => n + 1);
        setReady(true);
      },
      onError: (e) => setError(e.message),
      onTranslating: setTranslating,
      onAnalyzingNews: setAnalyzingNews,
      onConnection: setWsLive,
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
        strategy={data?.strategy ?? null}
        shortStrategy={data?.shortStrategy ?? null}
        marketFlow={data?.marketFlow ?? null}
        drivers={data?.drivers ?? []}
        username={username}
        lastUpdate={lastUpdate}
        online={online && wsLive}
        streamLive={wsLive}
        tickFlash={tickFlash}
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
        className="grid min-h-0 flex-1 gap-1.5 p-1.5"
        style={{
          gridTemplateColumns: "minmax(220px, 26%) minmax(280px, 36%) minmax(260px, 1fr)",
          gridTemplateRows: "minmax(0, 1fr) minmax(130px, 28%)",
          gridTemplateAreas: `
            "strategies chart intel"
            "news news news"
          `,
        }}
      >
        <div style={{ gridArea: "strategies" }} className="min-h-0 overflow-hidden">
          <StrategiesStackPanel
            longStrategy={data?.strategy ?? null}
            shortStrategy={data?.shortStrategy ?? null}
            forecast={forecast}
            forecastLoading={forecastLoading}
            hasApiKey={hasApiKey}
            price={price}
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
            candles={data?.chart?.candles ?? []}
            interval={chartInterval}
            onIntervalChange={handleIntervalChange}
          />
        </div>

        <div style={{ gridArea: "intel" }} className="min-h-0 overflow-hidden">
          <IntelligenceHub
            analysis={data?.newsAnalysis ?? null}
            marketFlow={data?.marketFlow ?? null}
            drivers={data?.drivers ?? []}
            longStrategy={data?.strategy ?? null}
            shortStrategy={data?.shortStrategy ?? null}
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
          className="grid min-h-0 grid-cols-3 gap-px overflow-hidden rounded-md border border-[var(--term-border)] bg-[var(--term-panel)]"
        >
          <NewsColumn
            title={UZ.streams.direct}
            icon="🥇"
            items={news.direct}
            accent="text-[var(--term-gold)]"
            highlight
            maxItems={8}
          />
          <NewsColumn
            title={UZ.streams.macro}
            subtitle={UZ.streams.macroHint}
            icon="📊"
            items={news.macro}
            accent="text-[var(--term-green)]"
            maxItems={8}
          />
          <NewsColumn
            title={UZ.streams.geopolitics}
            subtitle={UZ.streams.geoHint}
            icon="🌍"
            items={news.geopolitics}
            accent="text-[var(--term-red)]"
            maxItems={8}
          />
        </div>
      </div>
    </div>
  );
}
