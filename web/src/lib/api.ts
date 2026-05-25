import type {
  ChartData,
  LongTermForecast,
  MonitorSnapshot,
  NewsMarketAnalysis,
  Session,
  UserPublic,
  UserRole,
} from "../../../shared/types";

const base = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || res.statusText || "So'rov xatosi");
  }
  return body;
}

export const api = {
  health: () => request<{ ok: boolean; aiReady: boolean }>("/api/health"),

  status: () => request<{ hasKey: boolean; online: boolean }>("/api/status"),

  auth: {
    login: (username: string, password: string) =>
      request<{ ok: boolean; session?: Session; error?: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
    getSession: () => request<{ session: Session | null }>("/api/auth/session"),
  },

  admin: {
    listUsers: () =>
      request<{ ok: boolean; users?: UserPublic[]; error?: string }>("/api/admin/users"),
    createUser: (username: string, password: string, role: UserRole) =>
      request<{ ok: boolean; user?: UserPublic; error?: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ username, password, role }),
      }),
    updateUser: (id: string, patch: { password?: string; role?: UserRole; active?: boolean }) =>
      request<{ ok: boolean; error?: string }>(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    deleteUser: (id: string) =>
      request<{ ok: boolean; error?: string }>(`/api/admin/users/${id}`, { method: "DELETE" }),
  },

  settings: {
    getApiKey: () =>
      request<{ hasKey: boolean; preview: string }>("/api/settings/api-key"),
    setApiKey: (key: string) =>
      request<{ ok: boolean }>("/api/settings/api-key", {
        method: "POST",
        body: JSON.stringify({ key }),
      }),
    testApiKey: (key: string) =>
      request<{ ok: boolean; hint?: string; model?: string; error?: string }>(
        "/api/settings/api-key/test",
        { method: "POST", body: JSON.stringify({ key }) }
      ),
    clearApiKey: () =>
      request<{ ok: boolean }>("/api/settings/api-key", { method: "DELETE" }),
    internet: () => request<{ online: boolean }>("/api/settings/internet"),
  },

  monitor: {
    getSnapshot: () => request<MonitorSnapshot>("/api/monitor/snapshot"),
    setChartInterval: (interval: string) =>
      request<ChartData>("/api/monitor/chart-interval", {
        method: "POST",
        body: JSON.stringify({ interval }),
      }),
    forecast: () =>
      request<LongTermForecast>("/api/monitor/forecast", { method: "POST" }),
    deepNewsAnalysis: () =>
      request<{ analysis: NewsMarketAnalysis }>("/api/monitor/news/deep-analysis", {
        method: "POST",
      }),
  },
};

export function connectMonitor(handlers: {
  onUpdate: (s: MonitorSnapshot) => void;
  onError: (e: { message: string }) => void;
  onTranslating: (v: boolean) => void;
  onAnalyzingNews: (v: boolean) => void;
}): () => void {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${window.location.host}/ws`);

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data as string) as { channel: string; data: unknown };
      switch (msg.channel) {
        case "monitor:update":
          handlers.onUpdate(msg.data as MonitorSnapshot);
          break;
        case "monitor:error":
          handlers.onError(msg.data as { message: string });
          break;
        case "monitor:translating":
          handlers.onTranslating(!!msg.data);
          break;
        case "monitor:analyzingNews":
          handlers.onAnalyzingNews(!!msg.data);
          break;
        default:
          break;
      }
    } catch {
      /* ignore malformed */
    }
  };

  ws.onerror = () => handlers.onError({ message: "WebSocket ulanishi uzildi" });

  return () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  };
}
