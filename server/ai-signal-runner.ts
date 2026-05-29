import { analyzeTechnicalsFull, formatEnhancedForAi } from "../shared/enhanced-technical";
import {
  buildAiTradeSignalPrompt,
  parseAiTradeSignalJson,
  SYSTEM_AI_TRADE_SIGNAL,
} from "../shared/prompts";
import { askClaude } from "../shared/anthropic";
import { setApiKey as setClaudeKey } from "../shared/anthropic";
import { formatM1ScalpForAi } from "../shared/m1-scalp";
import {
  formatLiveMomentumForAi,
  getLiveMomentum,
  guardScalpAiSignal,
} from "../shared/scalp-signal-guard";
import { enforceSwingTargets, formatSwingTargetsForAi } from "../shared/pip-targets";
import {
  computeSetupQuality,
  formatSetupQualityForAi,
} from "../shared/setup-quality";
import { deriveClearSignal, minConfidenceForSetup } from "../shared/clear-signal";
import { shouldBlockAiForecast } from "../shared/profit-protection";
import { completeAiSession, failAiSession } from "./ai-session";
import { getApiKey } from "./store";
import {
  getLastSnapshot,
  getMonitorContextForAi,
  refreshNewsDeepAnalysis,
} from "./monitor-service";
import { emitMonitorEvent } from "./events";
import { recordSignalIfNew } from "./signal-journal-store";

export async function runOneShotAiAnalysis(): Promise<void> {
  const key = getApiKey();
  if (!key?.trim()) {
    failAiSession("API kalit yo'q — Sozlamalarda Claude kalitini kiriting");
    broadcastUpdate();
    return;
  }

  setClaudeKey(key);

  await refreshNewsDeepAnalysis();
  const ctx = getMonitorContextForAi();
  if (!ctx.gold) {
    failAiSession("Narx mavjud emas — internet yoki serverni tekshiring");
    broadcastUpdate();
    return;
  }

  const snap = getLastSnapshot();
  let capitalWarning: string | undefined;
  if (snap?.platform) {
    const block = shouldBlockAiForecast({
      capitalShield: snap.platform.capitalShield,
      discipline: snap.platform.discipline,
      marketQuality: snap.platform.marketQuality,
    });
    if (block.block) {
      failAiSession(`HOLD — ${block.reasonUz}`);
      broadcastUpdate();
      return;
    }
    capitalWarning = block.warningUz;
  }

  const candles1m = ctx.candles1m.length ? ctx.candles1m : ctx.candles5m;
  const candles5m = ctx.candles5m.length ? ctx.candles5m : ctx.candles15m;
  const fallback = [
    {
      time: 0,
      open: ctx.gold.price,
      high: ctx.gold.price,
      low: ctx.gold.price,
      close: ctx.gold.price,
    },
  ];
  const c1 = candles1m.length ? candles1m : fallback;
  const tech = analyzeTechnicalsFull(c1);
  const tech5 = analyzeTechnicalsFull(candles5m.length ? candles5m : fallback);

  const live = getLiveMomentum(c1, ctx.gold.price);
  const setupQ =
    ctx.setupQuality ??
    computeSetupQuality({
      tech1: tech,
      tech5,
      news: ctx.newsAnalysis,
      m1Scalp: ctx.m1Scalp,
      live,
      calendar: ctx.calendar,
      disciplineScore: ctx.disciplineScore,
      capitalShieldOk: ctx.capitalShieldOk,
    });

  let setupHint: string | undefined;
  if (!setupQ.tradeAllowed) {
    setupHint = `Setup ${setupQ.score}/100 — ${setupQ.warningsUz[0] ?? "ehtiyot"}`;
  }

  const na = ctx.newsAnalysis;
  if (na?.contradictionsUz) {
    setupHint = `${setupHint ?? ""} · Yangiliklar zid`.trim();
  }

  const m1ScalpBlock =
    ctx.m1Scalp != null ? formatM1ScalpForAi(ctx.m1Scalp, tech, tech5) : undefined;
  const liveMomentumBlock = formatLiveMomentumForAi(live, ctx.gold.changePercent);
  const swingTargetBlock = formatSwingTargetsForAi(ctx.gold.price, tech5);
  const setupBlock = formatSetupQualityForAi(setupQ);
  const techBlock = `${formatEnhancedForAi(tech, "M1")}\n${formatEnhancedForAi(tech5, "5m")}`;

  const newsTitles = ctx.newsItems.map((n) => n.titleUz || n.title).slice(0, 10);

  const prompt = buildAiTradeSignalPrompt({
    price: ctx.gold.price,
    changePercent: ctx.gold.changePercent,
    high24h: ctx.gold.high24h,
    low24h: ctx.gold.low24h,
    tech,
    tech5m: tech5,
    m1ScalpBlock,
    liveMomentumBlock,
    swingTargetBlock,
    setupQualityBlock: setupBlock,
    techEnhancedBlock: techBlock,
    newsAnalysis: ctx.newsAnalysis,
    newsTitles,
    drivers: ctx.drivers.map((d) => ({ name: d.name, changePercent: d.changePercent })),
    calendarHint: ctx.calendar?.hintUz ?? ctx.calendar?.eventNameUz ?? undefined,
    disciplineScore: ctx.disciplineScore,
  });

  try {
    const raw = await askClaude(SYSTEM_AI_TRADE_SIGNAL, prompt, 2048);
    let signal = parseAiTradeSignalJson(raw, ctx.gold.price);

    const minConf = minConfidenceForSetup(setupQ.score);
    if (signal.action !== "HOLD" && signal.confidence < minConf) {
      signal = {
        ...signal,
        action: "HOLD",
        confidence: signal.confidence,
        summaryUz: `HOLD — ishonch ${signal.confidence}% (min ${minConf})`,
        triggerUz: "Aniqroq setup kuting",
      };
    }

    if (signal.action === "HOLD") {
      const rule = deriveClearSignal({
        price: ctx.gold.price,
        tech,
        tech5,
        setupQ,
        m1Scalp: ctx.m1Scalp,
        live,
      });
      if (rule) {
        signal = rule;
        console.log("[ai-signal] rule-based clear signal:", rule.action);
      }
    }

    const guarded = guardScalpAiSignal(signal, {
      candles1m: c1,
      price: ctx.gold.price,
      changePercent: ctx.gold.changePercent,
      tech1: tech,
      m1Scalp: ctx.m1Scalp,
      impulse: ctx.impulse,
    });
    signal = guarded.signal;

    const swing = enforceSwingTargets(signal, ctx.gold.price, tech5);
    signal = swing.signal;
    if (swing.rejected) {
      console.log("[ai-signal] swing reject:", swing.reasonUz);
    }

    const extra = [setupHint, capitalWarning].filter(Boolean).join(" · ");
    if (extra && signal.action !== "HOLD") {
      signal = {
        ...signal,
        summaryUz: `${signal.summaryUz} · ${extra}`,
      };
    }
    completeAiSession(signal);

    if (
      signal.action === "BUY" ||
      signal.action === "SELL"
    ) {
      recordSignalIfNew({
        horizon: "short",
        action: signal.action,
        strength: signal.confidence,
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        price: ctx.gold.price,
        dedupeMs: 45 * 60 * 1000,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI tahlil xatosi";
    failAiSession(msg);
  }

  broadcastUpdate();
}

function broadcastUpdate(): void {
  const snap = getLastSnapshot();
  if (snap) emitMonitorEvent("monitor:update", snap);
}
