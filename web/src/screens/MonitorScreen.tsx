import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { EmpireTerminal } from "../components/empire/EmpireTerminal";
import { MonitorLoading } from "../components/monitor/MonitorLoading";
import { api, connectMonitor } from "../lib/api";
import { useSignalNotifications } from "../hooks/useSignalNotifications";
import { requestNotificationPermission } from "../lib/notifications";
import { useMonitorStore } from "../store/monitor-store";

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
  const {
    snapshot,
    ready,
    lastUpdate,
    tickFlash,
    translating,
    analyzingNews,
    error,
    online,
    wsLive,
    connStatus,
    monitorSession,
    sessionBusy,
    applySnapshot,
    setReady,
    setError,
    setWsLive,
    setConnStatus,
    setTranslating,
    setAnalyzingNews,
    setMonitorSession,
    setSessionBusy,
  } = useMonitorStore(
    useShallow((s) => ({
      snapshot: s.snapshot,
      ready: s.ready,
      lastUpdate: s.lastUpdate,
      tickFlash: s.tickFlash,
      translating: s.translating,
      analyzingNews: s.analyzingNews,
      error: s.error,
      online: s.online,
      wsLive: s.wsLive,
      connStatus: s.connStatus,
      monitorSession: s.monitorSession,
      sessionBusy: s.sessionBusy,
      applySnapshot: s.applySnapshot,
      setReady: s.setReady,
      setError: s.setError,
      setWsLive: s.setWsLive,
      setConnStatus: s.setConnStatus,
      setTranslating: s.setTranslating,
      setAnalyzingNews: s.setAnalyzingNews,
      setMonitorSession: s.setMonitorSession,
      setSessionBusy: s.setSessionBusy,
    }))
  );

  useSignalNotifications(snapshot);

  useEffect(() => {
    void api.monitor.getSession().then(setMonitorSession).catch(() => {});
    void requestNotificationPermission();
  }, [setMonitorSession]);

  useEffect(() => {
    void api.monitor
      .getSnapshot()
      .then((s) => {
        applySnapshot(s);
        setConnStatus("online");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Yuklash xatosi");
        setReady(true);
        setConnStatus("offline");
      });

    const disconnect = connectMonitor({
      onUpdate: (s) => {
        applySnapshot(s);
        setWsLive(true);
        setConnStatus("online");
      },
      onError: (e) => setError(e.message),
      onTranslating: setTranslating,
      onAnalyzingNews: setAnalyzingNews,
      onConnection: (live) => {
        setWsLive(live);
        setConnStatus(live ? "online" : "reconnecting");
      },
      onPing: () => {},
    });

    return disconnect;
  }, [
    applySnapshot,
    setReady,
    setError,
    setWsLive,
    setConnStatus,
    setTranslating,
    setAnalyzingNews,
  ]);

  // WS uzilganda zaxira poll (sekinroq — asosiy kanal WS)
  useEffect(() => {
    const poll = setInterval(() => {
      if (wsLive) return;
      void api.monitor
        .getSnapshot()
        .then((s) => applySnapshot(s))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(poll);
  }, [wsLive, applySnapshot]);

  const handleStartMonitor = async (mode: "scalp" | "swing" = "swing") => {
    setSessionBusy(true);
    setError(null);
    try {
      const session = await api.monitor.start(mode);
      setMonitorSession(session);
      const s = await api.monitor.getSnapshot();
      applySnapshot(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start xatosi");
    } finally {
      setSessionBusy(false);
    }
  };

  const aiPhase = snapshot?.aiPhase ?? monitorSession?.phase ?? "idle";
  const liveOk = online && wsLive && !snapshot?.priceStale && !snapshot?.feedError;

  if (!ready) return <MonitorLoading />;

  return (
    <div className="h-full min-h-0 overflow-hidden">
      {error && (
        <div className="relative z-50 bg-black/90 px-3 py-1 text-center text-[10px] text-[#ff6b4a]">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>
            yopish
          </button>
        </div>
      )}
      <EmpireTerminal
        username={username}
        data={snapshot}
        aiPhase={aiPhase}
        session={monitorSession ?? snapshot?.aiSession ?? snapshot?.monitorSession ?? null}
        sessionBusy={sessionBusy}
        lastUpdate={lastUpdate}
        liveOk={liveOk}
        connStatus={connStatus}
        tickFlash={tickFlash}
        translating={translating || analyzingNews}
        onRequestForecast={(mode) => void handleStartMonitor(mode)}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
        isAdmin={isAdmin}
        onOpenAdmin={onOpenAdmin}
      />
    </div>
  );
}
