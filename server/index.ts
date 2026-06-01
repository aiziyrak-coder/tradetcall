import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cookieParser from "cookie-parser";
import { WebSocketServer } from "ws";
import type { Session } from "../shared/types";
import {
  getDjangoAdminUrl,
  getSession,
  createUserWithToken,
  deleteUserWithToken,
  listUsersWithToken,
  login,
  logout,
  resetUserPasswordWithToken,
  updateUserWithToken,
} from "./auth";
import { djangoHealth } from "./django-client";
import { addMonitorClient, emitMonitorEvent } from "./events";
import { checkInternet } from "./network";
import {
  getAiSessionStatus,
  isAiSessionActive,
  setAiSessionChangeHandler,
  startAiSession,
  stopAiSession,
} from "./ai-session";
import {
  buildSnapshot,
  getLastSnapshot,
  runForecast,
  runNewsDeepAnalysis,
  startMonitorService,
  stopMonitorService,
} from "./monitor-service";
import {
  getJournalSnapshot,
  getWeeklyReportExport,
  markJournalOutcome,
  setJournalNote,
} from "./signal-journal-store";
import {
  clearEnvApiKeys,
  setApiKey as setLlmKey,
  testApiKey,
} from "../shared/deepseek";
import { getApiKey, setApiKey as persistApiKey } from "./store";

const bootKey = getApiKey();
if (bootKey) setLlmKey(bootKey);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const COOKIE = "xauusd_session";
const isProd = process.env.NODE_ENV === "production";
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

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (authSession(req).role !== "admin") {
    res.status(403).json({ ok: false, error: "Faqat admin" });
    return;
  }
  next();
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
  const preview =
    key.length > 12 ? `${key.slice(0, 10)}…${key.slice(-4)}` : key ? "••••" : "";
  res.json({ hasKey: !!key, preview });
});

app.post("/api/settings/api-key", (req, res) => {
  const { key } = req.body as { key?: string };
  if (!key?.trim()) {
    res.status(400).json({ error: "Kalit bo'sh" });
    return;
  }
  persistApiKey(key.trim());
  setLlmKey(key.trim());
  res.json({ ok: true });
});

app.post("/api/settings/api-key/test", async (req, res) => {
  const { key } = req.body as { key?: string };
  const toTest = key?.trim() || getApiKey();
  if (!toTest) {
    res.status(400).json({ error: "Kalit kiritilmagan" });
    return;
  }
  try {
    clearEnvApiKeys();
    setLlmKey(toTest);
    const { hint, model } = await testApiKey(toTest);
    res.json({ ok: true, hint, model });
  } catch (e) {
    res.status(400).json({
      ok: false,
      error: e instanceof Error ? e.message : "Test xatosi",
    });
  } finally {
    const restored = getApiKey();
    setLlmKey(restored);
  }
});

app.delete("/api/settings/api-key", (req, res) => {
  persistApiKey("");
  clearEnvApiKeys();
  setLlmKey("");
  res.json({ ok: true });
});

app.use("/api/admin", requireAuth);
app.get("/api/admin/django-url", (_req, res) => {
  res.json({
    url: process.env.DJANGO_PUBLIC_ADMIN_URL || getDjangoAdminUrl(),
  });
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const r = await listUsersWithToken(readToken(req));
  if (!r.ok) res.status(403).json(r);
  else res.json(r);
});

app.post("/api/admin/users", requireAdmin, async (req, res) => {
  const { username, password, role } = req.body as {
    username?: string;
    password?: string;
    role?: "admin" | "user";
  };
  if (!username?.trim() || !password) {
    res.status(400).json({ ok: false, error: "Login va parol kerak" });
    return;
  }
  const r = await createUserWithToken(readToken(req), {
    username: username.trim(),
    password,
    role: role === "admin" ? "admin" : "user",
  });
  if (!r.ok) res.status(400).json(r);
  else res.status(201).json(r);
});

app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
  const { username, role, active } = req.body as {
    username?: string;
    role?: "admin" | "user";
    active?: boolean;
  };
  const r = await updateUserWithToken(readToken(req), String(req.params.id), {
    ...(username !== undefined ? { username: username.trim() } : {}),
    ...(role !== undefined ? { role } : {}),
    ...(active !== undefined ? { active } : {}),
  });
  if (!r.ok) res.status(400).json(r);
  else res.json(r);
});

app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  const r = await deleteUserWithToken(readToken(req), String(req.params.id));
  if (!r.ok) res.status(400).json(r);
  else res.json(r);
});

app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password.length < 4) {
    res.status(400).json({ ok: false, error: "Parol kamida 4 belgi" });
    return;
  }
  const r = await resetUserPasswordWithToken(
    readToken(req),
    String(req.params.id),
    password
  );
  if (!r.ok) res.status(400).json(r);
  else res.json(r);
});

app.use("/api/monitor", requireAuth);

function requireAiSession(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!isAiSessionActive()) {
    res.status(403).json({
      error: "YANGI PROGNOZ bosing — bir martalik tahlil vaqtida ishlaydi.",
    });
    return;
  }
  next();
}

app.get("/api/monitor/session", (_req, res) => {
  res.json(getAiSessionStatus());
});

app.post("/api/monitor/start", (_req, res) => {
  const session = startAiSession();
  const snap = getLastSnapshot();
  if (snap) emitMonitorEvent("monitor:update", snap);
  res.json(session);
});

app.post("/api/monitor/stop", (_req, res) => {
  const session = stopAiSession("user");
  const snap = getLastSnapshot();
  if (snap) emitMonitorEvent("monitor:update", snap);
  res.json(session);
});

app.get("/api/monitor/snapshot", async (_req, res) => {
  try {
    const snap = await buildSnapshot();
    res.json(snap);
  } catch (e) {
    res.status(500).json({ error: clientErrorMessage(e) });
  }
});

app.post("/api/monitor/forecast", requireAiSession, async (_req, res) => {
  try {
    const forecast = await runForecast();
    res.json(forecast);
  } catch (e) {
    res.status(500).json({ error: clientErrorMessage(e) });
  }
});

app.post("/api/monitor/news/deep-analysis", requireAiSession, async (_req, res) => {
  try {
    const analysis = await runNewsDeepAnalysis();
    res.json({ analysis });
  } catch (e) {
    res.status(500).json({ error: clientErrorMessage(e) });
  }
});

app.get("/api/journal", requireAuth, (_req, res) => {
  res.json(getJournalSnapshot());
});

app.get("/api/reports/weekly", requireAuth, (_req, res) => {
  res.json({ ok: true, report: getWeeklyReportExport() });
});

app.patch("/api/journal/:id/note", requireAuth, (req, res) => {
  const { noteUz } = req.body as { noteUz?: string };
  if (!noteUz?.trim()) {
    res.status(400).json({ error: "Izoh kerak" });
    return;
  }
  const ok = setJournalNote(String(req.params.id), noteUz.trim());
  if (!ok) res.status(404).json({ error: "Topilmadi" });
  else res.json({ ok: true });
});

app.post("/api/journal/:id/outcome", requireAuth, (req, res) => {
  const { outcome, noteUz } = req.body as {
    outcome?: string;
    noteUz?: string;
  };
  const valid = ["win", "loss", "cancelled", "expired"];
  if (!outcome || !valid.includes(outcome)) {
    res.status(400).json({ error: "outcome: win | loss | cancelled | expired" });
    return;
  }
  const id = String(req.params.id);
  const ok = markJournalOutcome(
    id,
    outcome as "win" | "loss" | "cancelled" | "expired",
    noteUz
  );
  if (!ok) res.status(404).json({ error: "Topilmadi" });
  else res.json({ ok: true });
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

setAiSessionChangeHandler(() => {
  const snap = getLastSnapshot();
  if (snap) emitMonitorEvent("monitor:update", snap);
});

startMonitorService();

function shutdown(signal: string) {
  console.log(`${signal} — to'xtatilmoqda`);
  stopAiSession("user");
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
