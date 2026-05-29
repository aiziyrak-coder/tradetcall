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
  minScoreForTrade,
} from "../shared/setup-quality";
import { shouldBlockAiForecast } from "../shared/profit-protection";
import { completeAiSession, failAiSession } from "./ai-session";
import { getApiKey } from "./store";
import {
  getLastSnapshot,
  getMonitorContextForAi,
  refreshNewsDeepAnalysis,
} from "./monitor-service";
import { emitMonitorEvent } from "./events";

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

  if (!setupQ.tradeAllowed || setupQ.score < minScoreForTrade()) {
    failAiSession(
      `HOLD — setup ${setupQ.score}/100 yetarli emas. ${setupQ.warningsUz[0] ?? setupQ.summaryUz}`
    );
    broadcastUpdate();
    return;
  }

  const na = ctx.newsAnalysis;
  if (na?.contradictionsUz) {
    failAiSession(`HOLD — yangiliklar zid: ${na.contradictionsUz.slice(0, 120)}`);
    broadcastUpdate();
    return;
  }
  if (na && !na.newsCandleAligned && setupQ.score < 72) {
    failAiSession(
      "HOLD — yangiliklar va shamlar mos emas. Faqat A-setup (72+) da kiring."
    );
    broadcastUpdate();
    return;
  }

  if (tech5.adx < 20 && tech.adx < 20) {
    failAiSession("HOLD — trend kuchsiz (ADX past). Aniq setup kuting.");
    broadcastUpdate();
    return;
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

    if (signal.action !== "HOLD" && signal.confidence < 58) {
      signal = {
        ...signal,
        action: "HOLD",
        confidence: signal.confidence,
        summaryUz: `HOLD — AI ishonch ${signal.confidence}% past (min 58)`,
        triggerUz: "Aniqroq setup kuting",
      };
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

    if (capitalWarning && signal.action !== "HOLD") {
      signal = {
        ...signal,
        summaryUz: `${signal.summaryUz} · ${capitalWarning}`,
      };
    }
    completeAiSession(signal);
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
