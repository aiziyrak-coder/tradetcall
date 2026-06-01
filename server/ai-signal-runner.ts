import { analyzeTechnicalsFull } from "../shared/enhanced-technical";
import { AI_MAX_OUTPUT_TOKENS, AI_SKIP_CLAUDE_MIN_CONFIDENCE } from "../shared/ai-config";
import {
  buildCompactAiTradeSignalPrompt,
  SYSTEM_AI_TRADE_SIGNAL_COMPACT,
} from "../shared/compact-prompt";
import { parseAiTradeSignalJson } from "../shared/prompts";
import { askClaude } from "../shared/anthropic";
import { setApiKey as setClaudeKey } from "../shared/anthropic";
import { getLiveMomentum, guardScalpAiSignal } from "../shared/scalp-signal-guard";
import { enforceSwingTargets } from "../shared/pip-targets";
import { computeSetupQuality } from "../shared/setup-quality";
import { deriveClearSignal, minConfidenceForSetup } from "../shared/clear-signal";
import { enrichRuleSignal } from "../shared/rule-signal-enrich";
import { shouldBlockAiForecast } from "../shared/profit-protection";
import type { AiTradeSignal } from "../shared/ai-trade-signal";
import type { Candle } from "../shared/types";
import { completeAiSession, failAiSession } from "./ai-session";
import { getApiKey } from "./store";
import {
  getLastSnapshot,
  getMonitorContextForAi,
  refreshNewsDeepAnalysis,
} from "./monitor-service";
import { emitMonitorEvent } from "./events";
import { recordSignalIfNew } from "./signal-journal-store";
import { clearPause } from "./shield-runtime";

export async function runOneShotAiAnalysis(): Promise<void> {
  const key = getApiKey();
  if (!key?.trim()) {
    failAiSession("API kalit yo'q — Sozlamalarda Claude kalitini kiriting");
    broadcastUpdate();
    return;
  }

  setClaudeKey(key);
  clearPause();

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
  const c1: Candle[] = candles1m.length ? candles1m : fallback;
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
  if (ctx.newsAnalysis?.contradictionsUz) {
    setupHint = `${setupHint ?? ""} · Yangiliklar zid`.trim();
  }

  const ruleCandidate = deriveClearSignal({
    price: ctx.gold.price,
    tech,
    tech5,
    setupQ,
    m1Scalp: ctx.m1Scalp,
    live,
  });

  try {
    let signal: AiTradeSignal;

    if (
      ruleCandidate &&
      ruleCandidate.action !== "HOLD" &&
      ruleCandidate.confidence >= AI_SKIP_CLAUDE_MIN_CONFIDENCE
    ) {
      signal = enrichRuleSignal(ruleCandidate, {
        setupQ,
        m1Scalp: ctx.m1Scalp,
        live,
      });
      console.log("[ai-signal] rule-only (0 Claude token):", signal.action);
    } else {
      const prompt = buildCompactAiTradeSignalPrompt({
        price: ctx.gold.price,
        changePercent: ctx.gold.changePercent,
        tech,
        tech5,
        setupScore: setupQ.score,
        longScore: setupQ.longScore,
        shortScore: setupQ.shortScore,
        m1Scalp: ctx.m1Scalp,
        live,
        news: ctx.newsAnalysis,
        suggestedAction:
          ruleCandidate?.action === "BUY" || ruleCandidate?.action === "SELL"
            ? ruleCandidate.action
            : null,
      });
      const raw = await askClaude(
        SYSTEM_AI_TRADE_SIGNAL_COMPACT,
        prompt,
        AI_MAX_OUTPUT_TOKENS
      );
      signal = parseAiTradeSignalJson(raw, ctx.gold.price);
    }

    signal = applySignalPipeline(signal, {
      c1,
      price: ctx.gold.price,
      changePercent: ctx.gold.changePercent,
      tech,
      tech5,
      setupQ,
      m1Scalp: ctx.m1Scalp,
      live,
      impulse: ctx.impulse,
    });

    const extra = [setupHint, capitalWarning].filter(Boolean).join(" · ");
    if (extra && signal.action !== "HOLD") {
      signal = { ...signal, summaryUz: `${signal.summaryUz} · ${extra}` };
    }

    completeAiSession(signal);
    recordIfTrade(signal, ctx.gold.price);
  } catch (e) {
    console.warn("[ai-signal] error:", e);
    const rule = deriveClearSignal({
      price: ctx.gold.price,
      tech,
      tech5,
      setupQ,
      m1Scalp: ctx.m1Scalp,
      live,
    });
    if (rule) {
      let signal = enrichRuleSignal(rule, { setupQ, m1Scalp: ctx.m1Scalp, live });
      signal = applySignalPipeline(signal, {
        c1,
        price: ctx.gold.price,
        changePercent: ctx.gold.changePercent,
        tech,
        tech5,
        setupQ,
        m1Scalp: ctx.m1Scalp,
        live,
        impulse: ctx.impulse,
      });
      const extra = [setupHint, capitalWarning].filter(Boolean).join(" · ");
      if (extra && signal.action !== "HOLD") {
        signal = { ...signal, summaryUz: `${signal.summaryUz} · ${extra}` };
      }
      completeAiSession(signal);
      recordIfTrade(signal, ctx.gold.price);
    } else {
      failAiSession(e instanceof Error ? e.message : "AI tahlil xatosi");
    }
  }

  broadcastUpdate();
}

function applySignalPipeline(
  signal: AiTradeSignal,
  ctx: {
    c1: Candle[];
    price: number;
    changePercent: number;
    tech: ReturnType<typeof analyzeTechnicalsFull>;
    tech5: ReturnType<typeof analyzeTechnicalsFull>;
    setupQ: ReturnType<typeof computeSetupQuality>;
    m1Scalp: ReturnType<typeof getMonitorContextForAi>["m1Scalp"];
    live: ReturnType<typeof getLiveMomentum>;
    impulse: ReturnType<typeof getMonitorContextForAi>["impulse"];
  }
): AiTradeSignal {
  let s = signal;
  const minConf = minConfidenceForSetup(ctx.setupQ.score);
  if (s.action !== "HOLD" && s.confidence < minConf) {
    s = {
      ...s,
      action: "HOLD",
      summaryUz: `HOLD — ishonch ${s.confidence}% (min ${minConf})`,
      triggerUz: "Aniqroq setup kuting",
    };
  }

  if (s.action === "HOLD") {
    const rule = deriveClearSignal({
      price: ctx.price,
      tech: ctx.tech,
      tech5: ctx.tech5,
      setupQ: ctx.setupQ,
      m1Scalp: ctx.m1Scalp,
      live: ctx.live,
    });
    if (rule) s = rule;
  }

  const guarded = guardScalpAiSignal(s, {
    candles1m: ctx.c1,
    price: ctx.price,
    changePercent: ctx.changePercent,
    tech1: ctx.tech,
    m1Scalp: ctx.m1Scalp,
    impulse: ctx.impulse,
  });
  s = guarded.signal;

  const swing = enforceSwingTargets(s, ctx.price, ctx.tech5);
  s = swing.signal;
  if ((swing.rejected || s.action === "HOLD") && s.action === "HOLD") {
    const rule = deriveClearSignal({
      price: ctx.price,
      tech: ctx.tech,
      tech5: ctx.tech5,
      setupQ: ctx.setupQ,
      m1Scalp: ctx.m1Scalp,
      live: ctx.live,
    });
    if (rule) {
      const swing2 = enforceSwingTargets(rule, ctx.price, ctx.tech5);
      s = swing2.rejected ? rule : swing2.signal;
    }
  }
  return s;
}

function recordIfTrade(signal: AiTradeSignal, price: number): void {
  if (signal.action !== "BUY" && signal.action !== "SELL") return;
  recordSignalIfNew({
    horizon: "short",
    action: signal.action,
    strength: signal.confidence,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    price,
    dedupeMs: 45 * 60 * 1000,
  });
}

function broadcastUpdate(): void {
  const snap = getLastSnapshot();
  if (snap) emitMonitorEvent("monitor:update", snap);
}
