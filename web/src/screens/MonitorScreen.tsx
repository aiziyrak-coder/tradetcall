import { useEffect, useState } from "react";
import type { MonitorSessionInfo, MonitorSnapshot } from "../../../shared/types";
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
  const [, setTickFlash] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [analyzingNews, setAnalyzingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [wsLive, setWsLive] = useState(false);
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
      onPing: () => {},
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

  const aiPhase = data?.aiPhase ?? monitorSession?.phase ?? "idle";
  const liveOk = online && wsLive && !data?.priceStale && !data?.feedError;

  if (!ready) return <MonitorLoading />;

  return (
    <div className="flex h-full min-h-0 flex-col bg-neutral-950 text-neutral-300">
      {error && (
        <div className="shrink-0 bg-red-950/80 px-3 py-1 text-center text-xs text-red-300">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>
            yopish
          </button>
        </div>
      )}

      <header className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-2 text-sm">
        <span className="text-neutral-500">{username}</span>
        <div className="flex items-center gap-3 text-xs">
          <span className={liveOk ? "text-emerald-500" : "text-neutral-500"}>
            {liveOk ? "jonli" : "offline"}
          </span>
          <span className="font-mono text-neutral-500">{lastUpdate}</span>
          <button
            type="button"
            className="text-neutral-400 hover:text-white"
            disabled={sessionBusy || aiPhase === "analyzing"}
            onClick={() => void handleStartMonitor()}
          >
            {sessionBusy || aiPhase === "analyzing" ? "…" : UZ.monitorForecast}
          </button>
          {onOpenSettings && (
            <button type="button" className="text-neutral-400 hover:text-white" onClick={onOpenSettings}>
              {UZ.settings}
            </button>
          )}
          {isAdmin && onOpenAdmin && (
            <button type="button" className="text-neutral-400 hover:text-white" onClick={onOpenAdmin}>
              Admin
            </button>
          )}
          <button type="button" className="text-neutral-400 hover:text-white" onClick={onLogout}>
            {UZ.logout}
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center text-neutral-600">
        {(translating || analyzingNews) && (
          <p className="text-xs text-neutral-500">{UZ.translating}</p>
        )}
      </main>
    </div>
  );
}
