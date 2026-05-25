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
  createUser,
  deleteUser,
  ensureSeedUsers,
  getSession,
  listUsers,
  login,
  logout,
  updateUser,
} from "./auth";
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

function readToken(req: express.Request): string | undefined {
  return req.cookies[COOKIE] as string | undefined;
}

type AuthedRequest = express.Request & { session: Session };

function authSession(req: express.Request): Session {
  return (req as unknown as AuthedRequest).session;
}

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const session = getSession(readToken(req));
  if (!session) {
    res.status(401).json({ error: "Kirish kerak" });
    return;
  }
  (req as AuthedRequest).session = session;
  next();
}

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser(process.env.SESSION_SECRET || "change-me-in-production"));

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiReady: !!getApiKey() });
});

app.get("/api/status", (_req, res) => {
  res.json({ hasKey: !!getApiKey(), online: true });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ ok: false, error: "Login va parol kerak" });
    return;
  }
  const r = login(username, password);
  if (!r.ok || !r.token) {
    res.status(401).json(r);
    return;
  }
  res.cookie(COOKIE, r.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ ok: true, session: r.session });
});

app.post("/api/auth/logout", (req, res) => {
  logout(readToken(req));
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.get("/api/auth/session", (req, res) => {
  const session = getSession(readToken(req));
  res.json({ session });
});

app.get("/api/settings/internet", async (_req, res) => {
  res.json({ online: await checkInternet() });
});

app.use("/api/settings", requireAuth);

app.get("/api/settings/api-key", (req, res) => {
  const key = getApiKey();
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
app.get("/api/admin/users", (req, res) => {
  const r = listUsers(authSession(req));
  if (!r.ok) res.status(403).json(r);
  else res.json(r);
});

app.post("/api/admin/users", (req, res) => {
  const { username, password, role } = req.body as {
    username?: string;
    password?: string;
    role?: "admin" | "user";
  };
  const r = createUser(
    authSession(req),
    username ?? "",
    password ?? "",
    role ?? "user"
  );
  if (!r.ok) res.status(400).json(r);
  else res.json(r);
});

app.patch("/api/admin/users/:id", (req, res) => {
  const r = updateUser(
    authSession(req),
    req.params.id,
    req.body as { password?: string; role?: "admin" | "user"; active?: boolean }
  );
  if (!r.ok) res.status(400).json(r);
  else res.json(r);
});

app.delete("/api/admin/users/:id", (req, res) => {
  const r = deleteUser(authSession(req), req.params.id);
  if (!r.ok) res.status(400).json(r);
  else res.json(r);
});

app.use("/api/monitor", requireAuth);

app.get("/api/monitor/snapshot", async (_req, res) => {
  try {
    const snap = await buildSnapshot();
    res.json(snap);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Xato" });
  }
});

app.post("/api/monitor/chart-interval", async (req, res) => {
  const { interval } = req.body as { interval?: ChartInterval };
  if (!interval) {
    res.status(400).json({ error: "interval kerak" });
    return;
  }
  setChartInterval(interval);
  try {
    const chart = await getChartData();
    res.json(chart);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Xato" });
  }
});

app.post("/api/monitor/forecast", async (_req, res) => {
  try {
    const forecast = await runForecast();
    res.json(forecast);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Xato" });
  }
});

app.post("/api/monitor/news/deep-analysis", async (_req, res) => {
  try {
    const analysis = await runNewsDeepAnalysis();
    res.json({ analysis });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Xato" });
  }
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
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const cookie = req.headers.cookie ?? "";
  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.split("=")[1];
  if (!getSession(token)) {
    ws.close(4401, "Unauthorized");
    return;
  }

  const snap = getLastSnapshot();
  if (snap) ws.send(JSON.stringify({ channel: "monitor:update", data: snap }));

  const unsub = addMonitorClient((channel, data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ channel, data }));
    }
  });

  ws.on("close", unsub);
});

ensureSeedUsers();
startMonitorService();

server.listen(PORT, () => {
  console.log(`XAUUSD server http://127.0.0.1:${PORT} (prod=${isProd}, ai=${!!getApiKey()})`);
});
