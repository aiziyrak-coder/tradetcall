import { useEffect, useState } from "react";
import type { MonitorSessionInfo, MonitorSnapshot } from "../../../shared/types";
import { MarketForecastHub } from "../components/monitor/MarketForecastHub";
import { TechnicalIndicatorsPanel } from "../components/monitor/TechnicalIndicatorsPanel";
import { MonitorTopBar } from "../components/monitor/MonitorTopBar";
import { MarketContextBar } from "../components/monitor/MarketContextBar";
import { CalendarEventsStrip } from "../components/monitor/CalendarEventsStrip";
import { NewsColumn } from "../components/monitor/NewsColumn";
import { AiSignalPanel } from "../components/monitor/AiSignalPanel";
import { LivePriceHero } from "../components/monitor/LivePriceHero";
import { MonitorLoading } from "../components/monitor/MonitorLoading";
import { MonitorStatusStrip } from "../components/monitor/MonitorStatusStrip";
import { api, connectMonitor } from "../lib/api";
import { useSignalNotifications } from "../hooks/useSignalNotifications";
import { requestNotificationPermission } from "../lib/notifications";
import { UZ } from "../lib/uz";

function formatLiveTime(s: MonitorSnapshot): string {
  const t = s.priceUpdatedAt ?? s.timestamp;
  const d = new Date(t);
  const clock = d.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return s.tickSeq ? `${clock} · #${s.tickSeq}` : clock;
}

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
  const [lastUpdate, setLastUpdate] = useState("—");
  const [tickFlash, setTickFlash] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [analyzingNews, setAnalyzingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [wsLive, setWsLive] = useState(false);
  const [lastStreamAt, setLastStreamAt] = useState(0);
  const [monitorSession, setMonitorSession] = useState<MonitorSessionInfo | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);

  useSignalNotifications(data);

  useEffect(() => {
    void api.monitor.getSession().then(setMonitorSession).catch(() => {});
  }, []);

  useEffect(() => {
    void requestNotificationPermission();
  }, []);

  useEffect(() => {
    void api.monitor
      .getSnapshot()
      .then((s) => {
        setData(s);
        const sess = s.aiSession ?? s.monitorSession;
        if (sess) setMonitorSession(sess);
        setLastUpdate(formatLiveTime(s));
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
        const sess = s.aiSession ?? s.monitorSession;
        if (sess) setMonitorSession(sess);
        setLastUpdate(formatLiveTime(s));
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
      if (Date.now() - lastStreamAt < 1500) return;
      void api.monitor
        .getSnapshot()
        .then((s) => {
          setData(s);
          const sess = s.aiSession ?? s.monitorSession;
          if (sess) setMonitorSession(sess);
          setLastStreamAt(Date.now());
          setLastUpdate(formatLiveTime(s));
          setOnline(s.online);
        })
        .catch(() => {});
    }, 1000);
    return () => clearInterval(poll);
  }, [lastStreamAt]);

  const handleStartMonitor = async () => {
    setSessionBusy(true);
    setError(null);
    try {
      const session = await api.monitor.start();
      setMonitorSession(session);
      const s = await api.monitor.getSnapshot();
      setData(s);
      setOnline(s.online);
      setLastUpdate(formatLiveTime(s));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start xatosi");
    } finally {
      setSessionBusy(false);
    }
  };

  const handleStopMonitor = async () => {
    setSessionBusy(true);
    try {
      const session = await api.monitor.stop();
      setMonitorSession(session);
      const s = await api.monitor.getSnapshot();
      setData(s);
      if (s.aiSession) setMonitorSession(s.aiSession);
      else if (s.monitorSession) setMonitorSession(s.monitorSession);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stop xatosi");
    } finally {
      setSessionBusy(false);
    }
  };

  const price = data?.gold?.price ?? 0;
  const news = data?.news ?? { direct: [], macro: [], geopolitics: [] };
  const analysis = data?.newsAnalysis ?? null;
  const aiPhase = data?.aiPhase ?? monitorSession?.phase ?? "idle";
  const liveOk = online && wsLive && !data?.priceStale && !data?.feedError;

  if (!ready) {
    return <MonitorLoading />;
  }

  return (
    <div className="monitor-root monitor-compact relative flex flex-col overflow-hidden">
      <MonitorTopBar
        gold={data?.gold ?? null}
        aiSignal={data?.aiSignal ?? null}
        aiPhase={aiPhase}
        drivers={data?.drivers ?? []}
        username={username}
        lastUpdate={lastUpdate}
        online={online && (wsLive || !!data)}
        streamLive={wsLive}
        tickFlash={tickFlash}
        priceStale={data?.priceStale}
        feedError={data?.feedError}
        translating={translating || analyzingNews}
        monitorSession={monitorSession ?? data?.aiSession ?? data?.monitorSession}
        sessionBusy={sessionBusy}
        onStartMonitor={() => void handleStartMonitor()}
        onStopMonitor={() => void handleStopMonitor()}
        isAdmin={isAdmin}
        onOpenAdmin={onOpenAdmin}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
      />
      <MarketContextBar
        gold={data?.gold ?? null}
        marketTechnical={data?.marketTechnical ?? null}
        newsAnalysis={analysis}
        calendar={data?.calendar ?? null}
      />
      <CalendarEventsStrip calendar={data?.calendar ?? null} />
      <MonitorStatusStrip phase={aiPhase} busy={sessionBusy} />

      {error && (
        <div className="shrink-0 bg-red-950/60 px-2 py-0.5 text-center text-[9px] text-[var(--term-red)]">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>
            yopish
          </button>
        </div>
      )}

      {data?.feedError && !error && (
        <div className="shrink-0 bg-slate-900/80 px-2 py-0.5 text-center text-[9px] text-slate-300">
          {data.feedError}
        </div>
      )}

      <div
        className="monitor-layout grid min-h-0 flex-1 gap-2 p-2 max-md:flex max-md:flex-col"
        style={{
          gridTemplateColumns: "minmax(210px, 25%) minmax(200px, 1fr) minmax(300px, 40%)",
          gridTemplateRows: "minmax(0, 1fr) minmax(160px, 36%)",
          gridTemplateAreas: `
            "signal price forecast"
            "news news news"
          `,
        }}
      >
        <div style={{ gridArea: "signal" }} className="monitor-panel-strategies min-h-0 overflow-hidden">
          <AiSignalPanel
            phase={aiPhase}
            signal={data?.aiSignal ?? null}
            session={monitorSession ?? data?.aiSession ?? data?.monitorSession}
            currentPrice={price}
            onOpenSettings={onOpenSettings}
          />
        </div>

        <div style={{ gridArea: "price" }} className="monitor-panel-price min-h-0 overflow-hidden">
          <LivePriceHero
            gold={data?.gold ?? null}
            tickFlash={tickFlash}
            liveOk={liveOk}
            priceStale={data?.priceStale}
            lastUpdate={lastUpdate}
            marketBias={analysis?.overallBias ?? null}
            verdictUz={analysis?.tradeVerdictUz ?? analysis?.recommendationUz ?? null}
          />
        </div>

        <div
          className="monitor-panel-intel grid min-h-0 gap-2 overflow-hidden"
          style={{
            gridArea: "forecast",
            gridTemplateRows: "minmax(0, 1fr) auto",
          }}
        >
          <div className="min-h-0 overflow-hidden">
            <MarketForecastHub
              analysis={analysis}
              drivers={data?.drivers ?? []}
              aiSignal={data?.aiSignal ?? null}
              calendarSourceUz={
                data?.calendar?.source === "forexfactory"
                  ? "Forex Factory"
                  : data?.calendar?.source === "heuristic"
                    ? "Taxminiy taqvim"
                    : null
              }
            />
          </div>
          <TechnicalIndicatorsPanel technical={data?.marketTechnical} gold={data?.gold ?? null} />
        </div>

        <div
          style={{ gridArea: "news" }}
          className="monitor-panel-news monitor-news-cols term-card grid min-h-0 grid-cols-3 gap-px overflow-hidden !border-amber-500/20"
        >
          <NewsColumn
            title={UZ.streams.direct}
            icon="🥇"
            items={news.direct}
            accent="text-[var(--term-gold)]"
            highlight
            compact
            maxItems={10}
          />
          <NewsColumn
            title={UZ.streams.macro}
            subtitle={UZ.streams.macroHint}
            icon="📊"
            items={news.macro}
            accent="text-[var(--term-green)]"
            compact
            maxItems={10}
          />
          <NewsColumn
            title={UZ.streams.geopolitics}
            subtitle={UZ.streams.geoHint}
            icon="🌍"
            items={news.geopolitics}
            accent="text-[var(--term-red)]"
            compact
            maxItems={10}
          />
        </div>
      </div>
    </div>
  );
}
