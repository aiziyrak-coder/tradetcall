import { useEffect, useState } from "react";
import type { LongTermForecast, MonitorSnapshot } from "../../../shared/types";
import { GoldChart } from "../components/gold/GoldChart";
import { IntelligenceHub } from "../components/monitor/IntelligenceHub";
import { MonitorTopBar } from "../components/monitor/MonitorTopBar";
import { MarketContextBar } from "../components/monitor/MarketContextBar";
import { CalendarEventsStrip } from "../components/monitor/CalendarEventsStrip";
import { PriceLevelsVisual } from "../components/monitor/PriceLevelsVisual";
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
  const [lastStreamAt, setLastStreamAt] = useState(0);

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
        setChartInterval(s.chart?.interval ?? "5m");
        setLastUpdate(new Date(s.timestamp).toLocaleTimeString("uz-UZ"));
        setOnline(s.online);
        setWsLive(true);
        setLastStreamAt(Date.now());
        setTickFlash((n) => n + 1);
        setTranslating(!!s.translating);
        setAnalyzingNews(!!s.analyzingNews);
        setError(null);
        setReady(true);
      },
      onError: (e) => setError(e.message),
      onTranslating: setTranslating,
      onAnalyzingNews: setAnalyzingNews,
      onConnection: setWsLive,
      onPing: () => setLastStreamAt(Date.now()),
    });

    return disconnect;
  }, []);

  useEffect(() => {
    const poll = setInterval(() => {
      if (Date.now() - lastStreamAt < 3000) return;
      void api.monitor
        .getSnapshot()
        .then((s) => {
          setData(s);
          setLastStreamAt(Date.now());
          setLastUpdate(new Date(s.timestamp).toLocaleTimeString("uz-UZ"));
          setOnline(s.online);
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(poll);
  }, [lastStreamAt]);

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
        drivers={data?.drivers ?? []}
        username={username}
        lastUpdate={lastUpdate}
        online={online && (wsLive || !!data)}
        streamLive={wsLive}
        tickFlash={tickFlash}
        priceStale={data?.priceStale}
        feedError={data?.feedError}
        translating={translating || analyzingNews}
        newsReady={!!data?.newsAnalysis}
        mt5Bridge={data?.mt5Bridge ?? null}
        goldFeed={data?.gold?.feed}
        isAdmin={isAdmin}
        onOpenAdmin={onOpenAdmin}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
      />
      <MarketContextBar
        gold={data?.gold ?? null}
        shortStrategy={data?.shortStrategy ?? null}
        longStrategy={data?.strategy ?? null}
        newsAnalysis={data?.newsAnalysis ?? null}
        calendar={data?.calendar ?? null}
        mt5Bridge={data?.mt5Bridge ?? null}
      />
      <CalendarEventsStrip calendar={data?.calendar ?? null} />

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

        <div
          style={{ gridArea: "chart" }}
          className="grid min-h-0 grid-rows-[1fr_auto] gap-1 overflow-hidden rounded-md border border-[var(--term-border)]"
        >
          <GoldChart
            candles={data?.chart?.candles ?? []}
            interval={chartInterval}
            onIntervalChange={handleIntervalChange}
          />
          {data?.shortStrategy?.signal && price > 0 && (
            <div className="shrink-0 px-1 pb-1">
              <PriceLevelsVisual currentPrice={price} signal={data.shortStrategy.signal} />
            </div>
          )}
        </div>

        <div style={{ gridArea: "intel" }} className="min-h-0 overflow-hidden">
          <IntelligenceHub
            analysis={data?.newsAnalysis ?? null}
            drivers={data?.drivers ?? []}
            analyzing={analyzingNews}
            hasApiKey={hasApiKey}
            onDeepAnalysis={async () => {
              setError(null);
              try {
                const { analysis } = await api.monitor.deepNewsAnalysis();
                if (analysis) {
                  setData((prev) => (prev ? { ...prev, newsAnalysis: analysis } : prev));
                }
              } catch (e) {
                setError(e instanceof Error ? e.message : "Yangilik tahlili xatosi");
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
            compact
            maxItems={8}
          />
          <NewsColumn
            title={UZ.streams.macro}
            subtitle={UZ.streams.macroHint}
            icon="📊"
            items={news.macro}
            accent="text-[var(--term-green)]"
            compact
            maxItems={8}
          />
          <NewsColumn
            title={UZ.streams.geopolitics}
            subtitle={UZ.streams.geoHint}
            icon="🌍"
            items={news.geopolitics}
            accent="text-[var(--term-red)]"
            compact
            maxItems={8}
          />
        </div>
      </div>
    </div>
  );
}
