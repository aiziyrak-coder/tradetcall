/**
 * Selector-based Zustand store — tick kelganda faqat narx/signal
 * obuna bo'lgan komponentlar re-render bo'ladi (Context emas).
 */
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { MonitorSessionInfo, MonitorSnapshot } from "../../../shared/types";
import type { AiPhase } from "../../../shared/ai-trade-signal";

export type ConnStatus = "online" | "offline" | "reconnecting";

interface MonitorState {
  snapshot: MonitorSnapshot | null;
  ready: boolean;
  lastUpdate: string;
  tickFlash: number;
  translating: boolean;
  analyzingNews: boolean;
  error: string | null;
  online: boolean;
  wsLive: boolean;
  connStatus: ConnStatus;
  monitorSession: MonitorSessionInfo | null;
  sessionBusy: boolean;

  applySnapshot: (s: MonitorSnapshot) => void;
  setReady: (v: boolean) => void;
  setError: (e: string | null) => void;
  setWsLive: (v: boolean) => void;
  setConnStatus: (s: ConnStatus) => void;
  setTranslating: (v: boolean) => void;
  setAnalyzingNews: (v: boolean) => void;
  setMonitorSession: (s: MonitorSessionInfo | null) => void;
  setSessionBusy: (v: boolean) => void;
  bumpTick: () => void;
}

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

export const useMonitorStore = create<MonitorState>((set) => ({
  snapshot: null,
  ready: false,
  lastUpdate: "—",
  tickFlash: 0,
  translating: false,
  analyzingNews: false,
  error: null,
  online: true,
  wsLive: false,
  connStatus: "offline",
  monitorSession: null,
  sessionBusy: false,

  applySnapshot: (s) =>
    set((st) => ({
      snapshot: s,
      lastUpdate: formatLiveTime(s),
      online: s.online,
      translating: !!s.translating,
      analyzingNews: !!s.analyzingNews,
      error: null,
      ready: true,
      tickFlash: st.tickFlash + 1,
      monitorSession: s.aiSession ?? s.monitorSession ?? st.monitorSession,
    })),

  setReady: (v) => set({ ready: v }),
  setError: (e) => set({ error: e }),
  setWsLive: (v) =>
    set((st) => ({
      wsLive: v,
      connStatus: v ? "online" : st.connStatus === "online" ? "reconnecting" : st.connStatus,
    })),
  setConnStatus: (s) => set({ connStatus: s }),
  setTranslating: (v) => set({ translating: v }),
  setAnalyzingNews: (v) => set({ analyzingNews: v }),
  setMonitorSession: (s) => set({ monitorSession: s }),
  setSessionBusy: (v) => set({ sessionBusy: v }),
  bumpTick: () => set((st) => ({ tickFlash: st.tickFlash + 1 })),
}));

/** Narx — faqat gold o'zgarsa re-render */
export function useGoldPrice() {
  return useMonitorStore((s) => s.snapshot?.gold ?? null);
}

export function useTickFlash() {
  return useMonitorStore((s) => s.tickFlash);
}

export function useAiSignal() {
  return useMonitorStore((s) => s.snapshot?.aiSignal ?? null);
}

export function useEngineSignal() {
  return useMonitorStore((s) => s.snapshot?.engineSignal ?? null);
}

export function useMarketTechnical() {
  return useMonitorStore((s) => s.snapshot?.marketTechnical ?? null);
}

export function useLiveOk() {
  return useMonitorStore(
    useShallow((s) => {
      const d = s.snapshot;
      return s.online && s.wsLive && !d?.priceStale && !d?.feedError;
    })
  );
}

export function useConnStatus(): ConnStatus {
  return useMonitorStore((s) => s.connStatus);
}

export function useAiPhase(): AiPhase {
  return useMonitorStore((s) => {
    const d = s.snapshot;
    return d?.aiPhase ?? s.monitorSession?.phase ?? "idle";
  });
}
