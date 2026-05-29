import { useEffect, useMemo, useState } from "react";
import type { MonitorSessionInfo, MonitorSnapshot } from "../../../shared/types";
import { IntelligenceHub } from "../components/monitor/IntelligenceHub";
import { PlatformCommandCenter } from "../components/monitor/PlatformCommandCenter";
import { MonitorTopBar } from "../components/monitor/MonitorTopBar";
import { MarketContextBar } from "../components/monitor/MarketContextBar";
import { CalendarEventsStrip } from "../components/monitor/CalendarEventsStrip";
import { PriceLevelsVisual } from "../components/monitor/PriceLevelsVisual";
import { NewsColumn } from "../components/monitor/NewsColumn";
import { StrategiesStackPanel } from "../components/monitor/StrategiesStackPanel";
import { LivePriceHero } from "../components/monitor/LivePriceHero";
import { api, connectMonitor } from "../lib/api";
import { useSignalNotifications } from "../hooks/useSignalNotifications";
import { requestNotificationPermission } from "../lib/notifications";
import { UZ } from "../lib/uz";
import { resolvePlatformInsight } from "../lib/platform-client";

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
    const endsAt = monitorSession?.endsAt ?? data?.aiSession?.endsAt;
    if (!monitorSession?.active || !endsAt) return;
    const tick = () => {
      const remainingMs = Math.max(0, new Date(endsAt).getTime() - Date.now());
      setMonitorSession((prev) => (prev?.active ? { ...prev, remainingMs } : prev));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [monitorSession?.active, monitorSession?.endsAt]);

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
  const platform = useMemo(() => resolvePlatformInsight(data), [data]);
  const activeSignal = data?.shortStrategy?.signal ?? data?.strategy?.signal ?? null;
  const liveOk = online && wsLive && !data?.priceStale && !data?.feedError;

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
        shortStrategy={data?.shortStrategy ?? null}
        longStrategy={data?.strategy ?? null}
        newsAnalysis={data?.newsAnalysis ?? null}
        calendar={data?.calendar ?? null}
      />
      <CalendarEventsStrip calendar={data?.calendar ?? null} />

      {!monitorSession?.active && !sessionBusy && (
        <div className="shrink-0 bg-violet-950/50 px-2 py-0.5 text-center text-[9px] text-violet-200">
          Narx, signallar, yangiliklar <b>doim ishlaydi</b>. <b>AI START</b> — faqat Claude token (
          {monitorSession?.autoStopMinutes ?? 30} daq, keyin avto-o&apos;chadi).
        </div>
      )}

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
        className="monitor-layout grid min-h-0 flex-1 gap-1.5 p-1.5 max-md:flex max-md:flex-col"
        style={{
          gridTemplateColumns: "minmax(220px, 28%) minmax(200px, 1fr) minmax(260px, 32%)",
          gridTemplateRows: "minmax(0, 1fr) minmax(130px, 28%)",
          gridTemplateAreas: `
            "strategies price intel"
            "news news news"
          `,
        }}
      >
        <div
          style={{ gridArea: "strategies" }}
          className="monitor-panel-strategies grid min-h-0 grid-rows-[1fr_auto] gap-1 overflow-hidden"
        >
          <StrategiesStackPanel
            longStrategy={data?.strategy ?? null}
            shortStrategy={data?.shortStrategy ?? null}
            tradingAllowed={platform?.capitalShield.allowed ?? true}
            disciplineScore={platform?.discipline.score ?? 100}
          />
          {activeSignal && price > 0 && (
            <div className="shrink-0 rounded-md border border-[var(--term-border)] px-1 py-1">
              <PriceLevelsVisual currentPrice={price} signal={activeSignal} />
            </div>
          )}
        </div>

        <div style={{ gridArea: "price" }} className="monitor-panel-price min-h-0 overflow-hidden">
          <LivePriceHero
            gold={data?.gold ?? null}
            tickFlash={tickFlash}
            liveOk={liveOk}
            priceStale={data?.priceStale}
            lastUpdate={lastUpdate}
          />
        </div>

        <div
          className="monitor-panel-intel grid min-h-0 gap-1 overflow-hidden"
          style={{
            gridArea: "intel",
            gridTemplateRows: "auto minmax(0, 1fr)",
          }}
        >
          <div className="min-h-0 max-h-[min(42vh,380px)] shrink-0 overflow-y-auto overscroll-contain">
            <PlatformCommandCenter data={data} />
          </div>
          <div className="min-h-0 overflow-hidden">
            <IntelligenceHub
              analysis={data?.newsAnalysis ?? null}
              drivers={data?.drivers ?? []}
              macroWarningUz={data?.platform?.macroCorrelation?.warningUz}
              calendarSourceUz={
                data?.calendar?.source === "forexfactory"
                  ? "Forex Factory (haqiqiy)"
                  : data?.calendar?.source === "heuristic"
                    ? "Taxminiy taqvim"
                    : null
              }
            />
          </div>
        </div>

        <div
          style={{ gridArea: "news" }}
          className="monitor-panel-news monitor-news-cols grid min-h-0 grid-cols-3 gap-px overflow-hidden rounded-md border border-[var(--term-border)] bg-[var(--term-panel)]"
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
