#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const checks = [];

function run(name, cmd) {
  try {
    execSync(cmd, { cwd: root, stdio: "pipe" });
    checks.push({ name, ok: true });
  } catch (e) {
    const err = e.stderr?.toString() || e.message;
    checks.push({ name, ok: false, err: err.slice(0, 800) });
  }
}

const required = [
  "server/monitor-service.ts",
  "server/index.ts",
  "shared/price.ts",
  "shared/chart.ts",
  "web/src/screens/MonitorScreen.tsx",
  "web/src/lib/api.ts",
];

for (const f of required) {
  checks.push({ name: `file: ${f}`, ok: existsSync(resolve(root, f)) });
}

const forbidden = ["electron/main.ts", "desktop/src/App.tsx"];
for (const f of forbidden) {
  checks.push({ name: `removed: ${f}`, ok: !existsSync(resolve(root, f)) });
}

run("tsc --noEmit", "npx tsc --noEmit");
run("build:server", "npm run build:server");
run("build:web", "npm run build:web");

const indexTs = readFileSync(resolve(root, "server/index.ts"), "utf8");
for (const route of ["/api/auth/login", "/api/monitor/snapshot", "/ws"]) {
  checks.push({ name: `route:${route}`, ok: indexTs.includes(route) || route === "/ws" });
}

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(c.ok ? "✓" : "✗", c.name);
  if (!c.ok && c.err) console.log("  ", c.err);
}

if (failed.length) process.exit(1);
console.log("\nAudit OK —", checks.length, "checks passed");
