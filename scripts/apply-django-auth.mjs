import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const djangoClient = `import type { Session, UserPublic } from "../shared/types";

const DJANGO_URL = (process.env.DJANGO_AUTH_URL || "http://127.0.0.1:8001").replace(
  /\\/$/,
  ""
);

async function djangoFetch<T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (init?.token) headers.Authorization = \`Bearer \${init.token}\`;

  const res = await fetch(\`\${DJANGO_URL}\${path}\`, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || res.statusText || "Django auth xatosi");
  return body;
}

export function getDjangoAdminUrl(): string {
  return \`\${DJANGO_URL}/admin/\`;
}

export async function djangoLogin(
  username: string,
  password: string
): Promise<{ ok: boolean; session?: Session; token?: string; error?: string }> {
  try {
    const data = await djangoFetch<{
      ok: boolean;
      token?: string;
      session?: Session;
      error?: string;
    }>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (!data.ok || !data.token || !data.session) {
      return { ok: false, error: data.error || "Login xatosi" };
    }
    return { ok: true, session: data.session, token: data.token };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Auth server ulanmadi",
    };
  }
}

export async function djangoGetSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const data = await djangoFetch<{ session: Session | null }>("/api/auth/me/", { token });
    return data.session ?? null;
  } catch {
    return null;
  }
}

export async function djangoListUsers(
  token: string
): Promise<{ ok: boolean; users?: UserPublic[]; error?: string }> {
  try {
    const data = await djangoFetch<{ ok: boolean; users?: UserPublic[] }>(
      "/api/auth/users/",
      { token }
    );
    return { ok: true, users: data.users ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Xato" };
  }
}

export async function djangoHealth(): Promise<boolean> {
  try {
    const res = await fetch(\`\${DJANGO_URL}/admin/login/\`, { method: "GET" });
    return res.ok || res.status === 302;
  } catch {
    return false;
  }
}
`;

const authTs = `import type { Session, UserPublic } from "../shared/types";
import {
  djangoGetSession,
  djangoListUsers,
  djangoLogin,
  getDjangoAdminUrl,
} from "./django-client";

export { getDjangoAdminUrl };

export function login(
  username: string,
  password: string
): Promise<{ ok: boolean; session?: Session; token?: string; error?: string }> {
  return djangoLogin(username, password);
}

export function logout(_token: string | undefined): void {
  /* JWT — cookie tozalanadi */
}

export function getSession(token: string | undefined): Promise<Session | null> {
  return djangoGetSession(token);
}

export function listUsersWithToken(
  token: string | undefined
): Promise<{ ok: boolean; users?: UserPublic[]; error?: string }> {
  if (!token) return Promise.resolve({ ok: false, error: "Token yo'q" });
  return djangoListUsers(token);
}
`;

function patchIndex() {
  const p = path.join(root, "server", "index.ts");
  let s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

  s = s.replace(
    `import {
  createUser,
  deleteUser,
  ensureSeedUsers,
  getSession,
  listUsers,
  login,
  logout,
  updateUser,
} from "./auth";`,
    `import {
  getDjangoAdminUrl,
  getSession,
  listUsersWithToken,
  login,
  logout,
} from "./auth";
import { djangoHealth } from "./django-client";`
  );

  s = s.replace(
    `function requireAuth(
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
}`,
    `async function requireAuth(
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
}`
  );

  s = s.replace(
    `app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiReady: !!getApiKey() });
});`,
    `app.get("/api/health", async (_req, res) => {
  res.json({ ok: true, aiReady: !!getApiKey(), djangoAuth: await djangoHealth() });
});`
  );

  s = s.replace(
    `app.post("/api/auth/login", (req, res) => {
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
});`,
    `app.post("/api/auth/login", async (req, res) => {
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
  res.cookie(COOKIE, r.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ ok: true, session: r.session });
});`
  );

  s = s.replace(
    `app.get("/api/auth/session", (req, res) => {
  const session = getSession(readToken(req));
  res.json({ session });
});`,
    `app.get("/api/auth/session", async (req, res) => {
  const session = await getSession(readToken(req));
  res.json({ session });
});`
  );

  const adminBlock = `app.use("/api/admin", requireAuth);
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
});`;

  const adminNew = `app.use("/api/admin", requireAuth);
app.get("/api/admin/django-url", (_req, res) => {
  res.json({ url: getDjangoAdminUrl() });
});

app.get("/api/admin/users", async (req, res) => {
  const r = await listUsersWithToken(readToken(req));
  if (!r.ok) res.status(403).json(r);
  else res.json(r);
});

app.post("/api/admin/users", (_req, res) => {
  res.status(403).json({ ok: false, error: \`Yangi user: \${getDjangoAdminUrl()}\` });
});

app.patch("/api/admin/users/:id", (_req, res) => {
  res.status(403).json({ ok: false, error: "Django Admin orqali tahrirlang" });
});

app.delete("/api/admin/users/:id", (_req, res) => {
  res.status(403).json({ ok: false, error: "Django Admin orqali o'chiring" });
});`;

  if (s.includes(adminBlock)) {
    s = s.replace(adminBlock, adminNew);
  } else if (s.includes('app.use("/api/admin", requireAuth)')) {
    s = s.replace(
      /app\.use\("\/api\/admin", requireAuth\);[\s\S]*?app\.delete\("\/api\/admin\/users\/:id"[\s\S]*?\}\);\n\n/,
      adminNew + "\n\n"
    );
  } else {
    console.error("index.ts admin block not found");
    process.exit(1);
  }

  s = s.replace(
    `wss.on("connection", (ws, req) => {
  const cookie = req.headers.cookie ?? "";
  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(\`\${COOKIE}=\`))
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
startMonitorService();`,
    `wss.on("connection", (ws, req) => {
  void (async () => {
    const cookie = req.headers.cookie ?? "";
    const token = cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(\`\${COOKIE}=\`))
      ?.split("=")[1];
    const session = await getSession(token);
    if (!session) {
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
  })();
});

startMonitorService();`
  );

  fs.writeFileSync(p, s);
}

function patchApi() {
  const p = path.join(root, "web", "src", "lib", "api.ts");
  let s = fs.readFileSync(p, "utf8");
  s = s.replace(/  UserRole,\n/, "");
  s = s.replace(
    `  admin: {
    listUsers: () =>
      request<{ ok: boolean; users?: UserPublic[]; error?: string }>("/api/admin/users"),
    createUser: (username: string, password: string, role: UserRole) =>
      request<{ ok: boolean; user?: UserPublic; error?: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ username, password, role }),
      }),
    updateUser: (id: string, patch: { password?: string; role?: UserRole; active?: boolean }) =>
      request<{ ok: boolean; error?: string }>(\`/api/admin/users/\${id}\`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    deleteUser: (id: string) =>
      request<{ ok: boolean; error?: string }>(\`/api/admin/users/\${id}\`, { method: "DELETE" }),
  },`,
    `  admin: {
    listUsers: () =>
      request<{ ok: boolean; users?: UserPublic[]; error?: string }>("/api/admin/users"),
    getDjangoUrl: () => request<{ url: string }>("/api/admin/django-url"),
  },`
  );
  fs.writeFileSync(p, s);
}

function patchPackage() {
  const p = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
  pkg.scripts.dev =
    'concurrently -k "npm run dev:django" "npm run dev:server" "npm run dev:web"';
  pkg.scripts["dev:django"] = "node scripts/run-django.mjs";
  pkg.scripts["setup:django"] = "node scripts/setup-django.mjs";
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");
}

function patchAdminScreen() {
  const p = path.join(root, "web", "src", "screens", "AdminScreen.tsx");
  const cur = fs.readFileSync(p, "utf8");
  if (!cur.includes("ModalMode")) return;
  fs.writeFileSync(p, fs.readFileSync(path.join(root, "scripts", "_admin-screen-django.tsx"), "utf8"));
}

fs.writeFileSync(path.join(root, "server", "django-client.ts"), djangoClient);
fs.writeFileSync(path.join(root, "server", "auth.ts"), authTs);
patchIndex();
patchApi();
patchAdminScreen();
patchPackage();
console.log("Django auth integratsiya qo'llandi.");
