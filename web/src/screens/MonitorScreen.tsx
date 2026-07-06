import { useEffect, useState } from "react";

import type { MonitorSessionInfo, MonitorSnapshot } from "../../../shared/types";

import { MarketForecastHub } from "../components/monitor/MarketForecastHub";

import { TechnicalIndicatorsPanel } from "../components/monitor/TechnicalIndicatorsPanel";

import { MonitorTopBar } from "../components/monitor/MonitorTopBar";

import { EmpireBackground } from "../components/monitor/EmpireBackground";

import { NewsColumn } from "../components/monitor/NewsColumn";

import { AiSignalPanel } from "../components/monitor/AiSignalPanel";

import { LivePriceHero } from "../components/monitor/LivePriceHero";

import { MonitorLoading } from "../components/monitor/MonitorLoading";

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

        setLastStreamAt(Date.now());

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

      void api.monitor

        .getSnapshot()

        .then((s) => {

          setData(s);

          const sess = s.aiSession ?? s.monitorSession;

          if (sess) setMonitorSession(sess);

          setLastStreamAt(Date.now());

          setLastUpdate(formatLiveTime(s));

          setOnline(s.online);

          setTickFlash((n) => n + 1);

          setTranslating(!!s.translating);

          setAnalyzingNews(!!s.analyzingNews);

        })

        .catch(() => {});

    }, 1500);

    return () => clearInterval(poll);

  }, []);



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



  const price = data?.gold?.price ?? 0;

  const news = data?.news ?? { direct: [], macro: [], geopolitics: [] };

  const analysis = data?.newsAnalysis ?? null;

  const aiPhase = data?.aiPhase ?? monitorSession?.phase ?? "idle";

  const liveOk = online && wsLive && !data?.priceStale && !data?.feedError;



  if (!ready) {

    return <MonitorLoading />;

  }



  return (

    <div className="monitor-root monitor-compact monitor-empire relative flex flex-col overflow-hidden">

      <EmpireBackground />



      <MonitorTopBar

        gold={data?.gold ?? null}

        aiSignal={data?.aiSignal ?? null}

        aiPhase={aiPhase}

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

        onRequestForecast={() => void handleStartMonitor()}

        isAdmin={isAdmin}

        onOpenAdmin={onOpenAdmin}

        onOpenSettings={onOpenSettings}

        onLogout={onLogout}

      />



      {(!wsLive || data?.priceStale) && online && (

        <div className="empire-alert shrink-0 px-2 py-1 text-center text-[9px] text-amber-200">

          {!wsLive

            ? "Jonli ulanish — narx HTTP orqali yangilanmoqda"

            : "Narx kechikmoqda"}

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



      <div

        className="monitor-layout relative z-[1] grid min-h-0 flex-1 gap-2 p-2 max-md:flex max-md:flex-col"

        style={{

          gridTemplateColumns: "minmax(220px, 28%) minmax(220px, 1fr) minmax(280px, 36%)",

          gridTemplateRows: "minmax(0, 1fr) minmax(140px, 32%)",

          gridTemplateAreas: `

            "signal price intel"

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

            aiSignal={data?.aiSignal ?? null}

          />

        </div>



        <div

          className="monitor-panel-intel grid min-h-0 gap-2 overflow-hidden"

          style={{

            gridArea: "intel",

            gridTemplateRows: "auto minmax(0, 1fr)",

          }}

        >

          <TechnicalIndicatorsPanel

            technical={data?.marketTechnical}

            m1Scalp={data?.m1Scalp}

            liveMomentum={data?.liveMomentum}

            setupQuality={data?.setupQuality}

            gold={data?.gold ?? null}

          />

          <div className="min-h-0 overflow-hidden">

            <MarketForecastHub analysis={analysis} drivers={data?.drivers ?? []} />

          </div>

        </div>



        <div

          style={{ gridArea: "news" }}

          className="monitor-panel-news monitor-news-cols empire-card-glow term-card grid min-h-0 grid-cols-3 gap-px overflow-hidden !border-amber-500/20"

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


