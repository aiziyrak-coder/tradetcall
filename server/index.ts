import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cookieParser from "cookie-parser";
import { WebSocketServer } from "ws";
import type { ChartInterval } from "../shared/chart";
import type { Session } from "../shared/types";
import {
  getDjangoAdminUrl,
  getSession,
  listUsersWithToken,
  login,
  logout,
} from "./auth";
import { djangoHealth } from "./django-client";
import { addMonitorClient } from "./events";
import { checkInternet } from "./network";
import {
  buildSnapshot,
  getChartData,
  getLastSnapshot,
  runForecast,
  runNewsDeepAnalysis,
  setChartInterval,
  startMonitorService,
  stopMonitorService,
} from "./monitor-service";
import {
  clearEnvApiKeys,
  setApiKey as setClaudeKey,
  testApiKey,
} from "../shared/anthropic";
import { getApiKey, setApiKey as persistApiKey } from "./store";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const COOKIE = "xauusd_session";
const isProd = process.env.NODE_ENV === "production";
const CHART_INTERVALS: ChartInterval[] = ["1m", "5m", "15m", "1h"];

const DEFAULT_SECRETS = new Set([
  "change-me-in-production",
  "change-django-secret-in-production",
]);

function assertProductionSecrets() {
  if (!isProd) return;
  const sessionSecret = process.env.SESSION_SECRET || "";
  const djangoSecret = process.env.DJANGO_SECRET_KEY || "";
  if (!sessionSecret || DEFAULT_SECRETS.has(sessionSecret)) {
    console.warn("[WARN] SESSION_SECRET production uchun o'rnatilmagan yoki zaif");
  }
  if (!djangoSecret || DEFAULT_SECRETS.has(djangoSecret)) {
    console.warn("[WARN] DJANGO_SECRET_KEY production uchun o'rnatilmagan yoki zaif");
  }
}

assertProductionSecrets();

const FRONTEND_ORIGINS = (
  process.env.FRONTEND_ORIGIN ||
  process.env.CORS_ORIGINS ||
  "https://trade.ziyrak.org"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function cookieOpts() {
  const opts: {
    httpOnly: boolean;
    path: string;
    secure: boolean;
    maxAge: number;
    sameSite: "lax" | "none";
    domain?: string;
  } = {
    httpOnly: true,
    path: "/",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  };
  if (isProd) {
    const domain = process.env.COOKIE_DOMAIN || ".ziyrak.org";
    opts.domain = domain;
    opts.sameSite = "none";
  }
  return opts;
}

function parseSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const prefix = `${COOKIE}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const raw = trimmed.slice(prefix.length);
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return undefined;
}

function readToken(req: express.Request): string | undefined {
  return (req.cookies[COOKIE] as string | undefined) ?? parseSessionCookie(req.headers.cookie);
}

type AuthedRequest = express.Request & { session: Session };

function authSession(req: express.Request): Session {
  return (req as unknown as AuthedRequest).session;
}

async function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  try {
    const session = await getSession(readToken(req));
    if (!session) {
      res.status(401).json({ error: "Kirish kerak" });
      return;
    }
    (req as AuthedRequest).session = session;
    next();
  } catch {
    res.status(503).json({ error: "Auth server ishlamayapti" });
  }
}

function clientErrorMessage(e: unknown, prod = isProd): string {
  if (!prod && e instanceof Error) return e.message;
  return "Server xatosi";
}

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser(process.env.SESSION_SECRET || "change-me-in-production"));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = origin && FRONTEND_ORIGINS.includes(origin);
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    if (!allowed && origin) {
      res.status(403).json({ error: "CORS rad etildi" });
      return;
    }
    res.sendStatus(204);
    return;
  }
  next();
});

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/status", requireAuth, (_req, res) => {
  res.json({ hasKey: !!getApiKey(), online: true });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ ok: false, error: "Login va parol kerak" });
      return;
    }
    const r = await login(username, password);
    if (!r.ok || !r.token) {
      res.status(401).json(r);
      return;
    }
    res.cookie(COOKIE, r.token, cookieOpts());
    res.json({ ok: true, session: r.session });
  } catch (e) {
    res.status(503).json({ ok: false, error: clientErrorMessage(e) });
  }
});

app.post("/api/auth/logout", (req, res) => {
  logout(readToken(req));
  res.clearCookie(COOKIE, cookieOpts());
  res.json({ ok: true });
});

app.get("/api/auth/session", async (req, res) => {
  try {
    const session = await getSession(readToken(req));
    res.json({ session });
  } catch {
    res.status(503).json({ session: null, error: "Auth server ishlamayapti" });
  }
});

app.get("/api/settings/internet", async (_req, res) => {
  res.json({ online: await checkInternet() });
});

app.use("/api/settings", requireAuth);

app.get("/api/settings/api-key", (req, res) => {
  const key = getApiKey();
  if (authSession(req).role !== "admin") {
    res.json({ hasKey: !!key, preview: "" });
    return;
  }
  const preview = key.length > 12 ? `${key.slice(0, 10)}…${key.slice(-4)}` : key ? "••••" : "";
  res.json({ hasKey: !!key, preview });
});

app.post("/api/settings/api-key", (req, res) => {
  if (authSession(req).role !== "admin") {
    res.status(403).json({ error: "Faqat admin" });
    return;
  }
  const { key } = req.body as { key?: string };
  if (!key?.trim()) {
    res.status(400).json({ error: "Kalit bo'sh" });
    return;
  }
  clearEnvApiKeys();
  persistApiKey(key.trim());
  setClaudeKey(getApiKey());
  res.json({ ok: true });
});

app.post("/api/settings/api-key/test", async (req, res) => {
  if (authSession(req).role !== "admin") {
    res.status(403).json({ error: "Faqat admin" });
    return;
  }
  const { key } = req.body as { key?: string };
  const toTest = key?.trim() || getApiKey();
  if (!toTest) {
    res.status(400).json({ error: "Kalit kiritilmagan" });
    return;
  }
  try {
    const { hint, model } = await testApiKey(toTest);
    res.json({ ok: true, hint, model });
  } catch (e) {
    res.status(400).json({
      ok: false,
      error: e instanceof Error ? e.message : "Test xatosi",
    });
  }
});

app.delete("/api/settings/api-key", (req, res) => {
  if (authSession(req).role !== "admin") {
    res.status(403).json({ error: "Faqat admin" });
    return;
  }
  persistApiKey("");
  clearEnvApiKeys();
  setClaudeKey("");
  res.json({ ok: true });
});

app.use("/api/admin", requireAuth);
app.get("/api/admin/django-url", (_req, res) => {
  res.json({
    url: process.env.DJANGO_PUBLIC_ADMIN_URL || getDjangoAdminUrl(),
  });
});

app.get("/api/admin/users", async (req, res) => {
  const r = await listUsersWithToken(readToken(req));
  if (!r.ok) res.status(403).json(r);
  else res.json(r);
});

app.post("/api/admin/users", (_req, res) => {
  res.status(403).json({ ok: false, error: `Yangi user: ${getDjangoAdminUrl()}` });
});

app.patch("/api/admin/users/:id", (_req, res) => {
  res.status(403).json({ ok: false, error: "Django Admin orqali tahrirlang" });
});

app.delete("/api/admin/users/:id", (_req, res) => {
  res.status(403).json({ ok: false, error: "Django Admin orqali o'chiring" });
});

app.use("/api/monitor", requireAuth);

app.get("/api/monitor/snapshot", async (_req, res) => {
  try {
    const snap = await buildSnapshot();
    res.json(snap);
  } catch (e) {
    res.status(500).json({ error: clientErrorMessage(e) });
  }
});

app.post("/api/monitor/chart-interval", async (req, res) => {
  const { interval } = req.body as { interval?: string };
  if (!interval || !CHART_INTERVALS.includes(interval as ChartInterval)) {
    res.status(400).json({ error: "interval: 1m, 5m, 15m yoki 1h" });
    return;
  }
  try {
    setChartInterval(interval as ChartInterval);
    const chart = await getChartData();
    res.json(chart);
  } catch (e) {
    res.status(500).json({ error: clientErrorMessage(e) });
  }
});

app.post("/api/monitor/forecast", async (_req, res) => {
  try {
    const forecast = await runForecast();
    res.json(forecast);
  } catch (e) {
    res.status(500).json({ error: clientErrorMessage(e) });
  }
});

app.post("/api/monitor/news/deep-analysis", async (_req, res) => {
  try {
    const analysis = await runNewsDeepAnalysis();
    res.json({ analysis });
  } catch (e) {
    res.status(500).json({ error: clientErrorMessage(e) });
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[express]", err);
  res.status(500).json({ error: clientErrorMessage(err) });
});

const webDist = path.join(process.cwd(), "dist-web");
if (isProd && fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/ws") return next();
    res.sendFile(path.join(webDist, "index.html"));
  });
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 512 * 1024 });

wss.on("connection", (ws, req) => {
  const authTimer = setTimeout(() => {
    if (ws.readyState === ws.OPEN) ws.close(1008, "Auth timeout");
  }, 8000);

  void (async () => {
    try {
      const token = parseSessionCookie(req.headers.cookie);
      const session = await getSession(token);
      clearTimeout(authTimer);
      if (!session) {
        ws.close(1008, "Unauthorized");
        return;
      }

      const snap = getLastSnapshot();
      if (snap) ws.send(JSON.stringify({ channel: "monitor:update", data: snap }));

      const unsub = addMonitorClient((channel, data) => {
        if (ws.readyState === ws.OPEN) {
          try {
            ws.send(JSON.stringify({ channel, data }));
          } catch {
            /* client slow */
          }
        }
      });

      ws.on("close", () => {
        clearTimeout(authTimer);
        unsub();
      });
    } catch {
      clearTimeout(authTimer);
      ws.close(1011, "Auth error");
    }
  })();
});

startMonitorService();

function shutdown(signal: string) {
  console.log(`${signal} — to'xtatilmoqda`);
  stopMonitorService();
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

server.listen(PORT, () => {
  console.log(`XAUUSD server http://127.0.0.1:${PORT} (prod=${isProd})`);
});
