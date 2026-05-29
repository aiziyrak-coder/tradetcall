#!/usr/bin/env node
/**
 * Production audit — web + server + shared (electron alohida)
 */
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const checks = [];

function ok(name) {
  checks.push({ name, ok: true });
}
function fail(name, err) {
  checks.push({ name, ok: false, err });
}

function run(name, cmd) {
  try {
    execSync(cmd, { cwd: root, stdio: "pipe" });
    ok(name);
  } catch (e) {
    fail(name, (e.stderr?.toString() || e.message || "").slice(0, 600));
  }
}

const mustExist = [
  "server/index.ts",
  "server/monitor-service.ts",
  "server/auth.ts",
  "web/src/screens/MonitorScreen.tsx",
  "web/src/lib/api.ts",
  "shared/strategy.ts",
  "shared/short-strategy.ts",
  "shared/horizon-verdict.ts",
  "shared/trade-gate.ts",
  "shared/platform-insight.ts",
  "shared/market-quality.ts",
  "shared/signal-explainer.ts",
  "shared/capital-shield.ts",
  "shared/platform-audit.ts",
  "shared/backtest-quick.ts",
  "shared/signal-journal-types.ts",
  "server/platform-service.ts",
  "server/signal-journal-store.ts",
  "web/src/components/monitor/PlatformCommandCenter.tsx",
  "web/src/components/monitor/PreTradeChecklist.tsx",
  "shared/technical.ts",
  "shared/market-regime.ts",
  "shared/economic-calendar.ts",
  "server/calendar-service.ts",
  "server/price-feed.ts",
  "django_auth/manage.py",
  "deploy/remote-setup.sh",
  "deploy/nginx-trade.ziyrak.org.conf",
  "deploy/nginx-tradeapi.ziyrak.org.conf",
  "deploy/systemd/trade-api.service",
  "deploy/systemd/trade-django.service",
];

for (const f of mustExist) {
  if (existsSync(resolve(root, f))) ok(`file: ${f}`);
  else fail(`file: ${f}`, "missing");
}

const indexTs = readFileSync(resolve(root, "server/index.ts"), "utf8");
if (indexTs.includes("COOKIE_DOMAIN") || indexTs.includes(".ziyrak.org")) {
  ok("security: cookie cross-subdomain");
} else {
  fail("security: cookie cross-subdomain", "missing COOKIE_DOMAIN for live stream auth");
}

if (/\.split\("="\)\[1\]/.test(indexTs) && !indexTs.includes("indexOf(\"=\")")) {
  fail("security: ws cookie parse", "JWT may truncate on = in value");
} else {
  ok("security: ws cookie parse");
}

const monitorTs = readFileSync(resolve(root, "server/monitor-service.ts"), "utf8");
if (monitorTs.includes("mergeSnapshot") || monitorTs.includes("function publishSnapshot")) {
  ok("monitor: snapshot merge");
} else {
  fail("monitor: snapshot merge", "no unified merge");
}

if (monitorTs.includes("enrichSnapshotWithPlatform")) {
  ok("monitor: platform intelligence");
} else {
  fail("monitor: platform intelligence", "missing enrichSnapshotWithPlatform");
}

if (!monitorTs.includes("computeMarketFlow") && !existsSync(resolve(root, "shared/market-flow.ts"))) {
  ok("monitor: no fake buy/sell flow");
} else {
  fail("monitor: fake buy/sell", "remove market-flow proxy");
}

if (
  monitorTs.includes("refreshPriceFast") &&
  monitorTs.includes("fetchAndPublishPrice") &&
  monitorTs.includes("HEARTBEAT_MS")
) {
  ok("monitor: split price/strategy stream");
} else {
  fail("monitor: split price/strategy stream", "price tick blocked by strategy");
}

const strategyTs = readFileSync(resolve(root, "shared/strategy.ts"), "utf8");
if (strategyTs.includes("waitTradeLevels")) {
  ok("strategy: wait levels after gate");
} else {
  fail("strategy: wait levels after gate", "SL/TP may show when gated wait");
}

if (strategyTs.includes("buildHorizonVerdict") && strategyTs.includes("verdict")) {
  ok("strategy: unified horizon verdict");
} else {
  fail("strategy: unified horizon verdict", "missing BUY/SELL/HOLD verdict");
}

const technicalTs = readFileSync(resolve(root, "shared/technical.ts"), "utf8");
if (technicalTs.includes("wilderAtr") && technicalTs.includes("wilderAdx")) {
  ok("technical: wilder atr/adx");
} else {
  fail("technical: wilder atr/adx", "missing pro indicators");
}

const gateTs = readFileSync(resolve(root, "shared/trade-gate.ts"), "utf8");
if (gateTs.includes("inHighImpactWindow") && gateTs.includes("goldLongAdjust")) {
  ok("gate: calendar + regime");
} else {
  fail("gate: calendar + regime", "missing macro filters");
}

const priceTs = readFileSync(resolve(root, "shared/price.ts"), "utf8");
if (priceTs.includes("fetchSpotGoldApi") && priceTs.includes("fetchYahooLive")) {
  ok("price: spot + yahoo feed");
} else {
  fail("price: spot + yahoo feed", "missing live price sources");
}

if (!existsSync(resolve(root, "server/mt5-bridge.ts"))) {
  ok("cleanup: no mt5 bridge");
} else {
  fail("cleanup: no mt5 bridge", "mt5-bridge still present");
}

run("tsc server+web", "npx tsc --noEmit -p tsconfig.audit.json");
run("build:web", "npm run build:web");
run("build:server", "npm run build:server");

const viteCfg = readFileSync(resolve(root, "web/vite.config.ts"), "utf8");
if (viteCfg.includes("tradeapi.ziyrak.org") || viteCfg.includes("VITE_API_BASE")) {
  ok("web: VITE_API_BASE default");
} else {
  fail("web: VITE_API_BASE default", "production API URL may be missing");
}

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(c.ok ? "✓" : "✗", c.name);
  if (!c.ok && c.err) console.log("   ", c.err);
}

if (failed.length) {
  console.error(`\nAudit FAILED — ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nAudit OK — ${checks.length} checks passed`);
