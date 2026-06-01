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
import { minConfidenceForSetup } from "../shared/clear-signal";
import {
  computeMarketForecast,
  tradeLevelsToAiSignal,
} from "../shared/forecast-levels";
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

  const forecastInput = {
    price: ctx.gold.price,
    tech1: tech,
    tech5,
    setupQ,
    m1Scalp: ctx.m1Scalp,
    live,
    news: ctx.newsAnalysis,
  };

  const forecast = computeMarketForecast(forecastInput);
  let signal = tradeLevelsToAiSignal(forecast, ctx.gold.price);

  try {
    const skipClaude =
      forecast.action === "HOLD" ||
      (forecast.action !== "HOLD" &&
        forecast.confidence >= AI_SKIP_CLAUDE_MIN_CONFIDENCE);

    if (!skipClaude) {
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
          forecast.action === "BUY" || forecast.action === "SELL"
            ? forecast.action
            : null,
        forecastHigh: forecast.forecastHigh,
        forecastLow: forecast.forecastLow,
        suggestedTp: forecast.takeProfit,
        suggestedSl: forecast.stopLoss,
      });
      const raw = await askClaude(
        SYSTEM_AI_TRADE_SIGNAL_COMPACT,
        prompt,
        AI_MAX_OUTPUT_TOKENS
      );
      const parsed = parseAiTradeSignalJson(raw, ctx.gold.price);
      signal = mergeAiWithForecast(parsed, forecast, ctx.gold.price);
      console.log("[ai-signal] Claude + forecast merge:", signal.action);
    } else {
      console.log(
        "[ai-signal]",
        forecast.action === "HOLD" ? "hold-forecast (0 token)" : "rule-forecast (0 token):",
        signal.action
      );
    }

    signal = applySignalPipeline(signal, forecastInput, {
      c1,
      price: ctx.gold.price,
      changePercent: ctx.gold.changePercent,
      impulse: ctx.impulse,
    });

    const extra = [setupHint, capitalWarning].filter(Boolean).join(" · ");
    if (extra) {
      signal = {
        ...signal,
        analysisUz: `${signal.analysisUz} ${extra}`.trim(),
      };
    }

    completeAiSession(signal);
    recordIfTrade(signal, ctx.gold.price);
  } catch (e) {
    console.warn("[ai-signal] error, forecast fallback:", e);
    let signal = tradeLevelsToAiSignal(forecast, ctx.gold.price);
    signal = applySignalPipeline(signal, forecastInput, {
      c1,
      price: ctx.gold.price,
      changePercent: ctx.gold.changePercent,
      impulse: ctx.impulse,
    });
    const extra = [setupHint, capitalWarning].filter(Boolean).join(" · ");
    if (extra) {
      signal = { ...signal, analysisUz: `${signal.analysisUz} ${extra}`.trim() };
    }
    completeAiSession(signal);
    recordIfTrade(signal, ctx.gold.price);
  }

  broadcastUpdate();
}

/** Claude JSON ni bozor bashorati darajalari bilan birlashtiradi */
function mergeAiWithForecast(
  ai: AiTradeSignal,
  forecast: ReturnType<typeof computeMarketForecast>,
  price: number
): AiTradeSignal {
  const base = tradeLevelsToAiSignal(forecast, price);

  if (ai.action === "HOLD" || forecast.action === "HOLD") {
    return {
      ...base,
      analysisUz: ai.analysisUz?.length > 40 ? ai.analysisUz : base.analysisUz,
      summaryUz: base.summaryUz,
    };
  }

  if (ai.action !== forecast.action) {
    return base;
  }

  const rewardAi = Math.abs(ai.takeProfit - ai.entry);
  const rewardFc = forecast.targetUsd;
  const useForecastLevels = rewardAi < 4 || Math.abs(rewardAi - 5) < 0.35;

  return {
    ...base,
    confidence: Math.round((ai.confidence + forecast.confidence) / 2),
    entry: useForecastLevels ? forecast.entry : ai.entry,
    stopLoss: useForecastLevels ? forecast.stopLoss : ai.stopLoss,
    takeProfit: useForecastLevels ? forecast.takeProfit : ai.takeProfit,
    riskReward: useForecastLevels ? forecast.riskReward : ai.riskReward,
    targetMoveUsd: useForecastLevels ? forecast.targetUsd : rewardAi,
    triggerUz: ai.triggerUz?.length > 20 ? ai.triggerUz : base.triggerUz,
    invalidationUz: ai.invalidationUz?.length > 15 ? ai.invalidationUz : base.invalidationUz,
    analysisUz: [base.analysisUz, ai.analysisUz].filter(Boolean).join(" ").slice(0, 900),
    summaryUz: base.summaryUz,
  };
}

function applySignalPipeline(
  signal: AiTradeSignal,
  forecastInput: Parameters<typeof computeMarketForecast>[0],
  ctx: {
    c1: Candle[];
    price: number;
    changePercent: number;
    impulse: ReturnType<typeof getMonitorContextForAi>["impulse"];
  }
): AiTradeSignal {
  let s = signal;
  const setupQ = forecastInput.setupQ;
  const minConf = minConfidenceForSetup(setupQ.score);

  if (s.action !== "HOLD" && s.confidence < minConf) {
    const hold = computeMarketForecast(forecastInput);
    s = tradeLevelsToAiSignal(hold, ctx.price);
    s = {
      ...s,
      summaryUz: `HOLD — ishonch ${signal.confidence}% (min ${minConf}%). ${hold.summaryUz}`,
      analysisUz: `${hold.analysisUz} Avvalgi yo'nalish: ${signal.action}, lekin ishonch yetarli emas.`,
    };
  }

  const guarded = guardScalpAiSignal(s, {
    candles1m: ctx.c1,
    price: ctx.price,
    changePercent: ctx.changePercent,
    tech1: forecastInput.tech1,
    m1Scalp: forecastInput.m1Scalp,
    impulse: ctx.impulse,
  });
  s = guarded.signal;

  if (s.action === "HOLD") {
    const hold = computeMarketForecast(forecastInput);
    s = {
      ...tradeLevelsToAiSignal(hold, ctx.price),
      analysisUz: guarded.reasonUz
        ? `${hold.analysisUz} ${guarded.reasonUz}`
        : hold.analysisUz,
    };
    return s;
  }

  const swing = enforceSwingTargets(s, ctx.price, forecastInput.tech5);
  s = swing.signal;

  if (swing.rejected && s.action === "HOLD") {
    const hold = computeMarketForecast(forecastInput);
    return tradeLevelsToAiSignal(hold, ctx.price);
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
