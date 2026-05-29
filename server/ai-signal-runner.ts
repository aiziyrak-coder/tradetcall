import { analyzeTechnicals } from "../shared/technical";
import {
  buildAiTradeSignalPrompt,
  parseAiTradeSignalJson,
  SYSTEM_AI_TRADE_SIGNAL,
} from "../shared/prompts";
import { askClaude } from "../shared/anthropic";
import { setApiKey as setClaudeKey } from "../shared/anthropic";
import { formatM1ScalpForAi } from "../shared/m1-scalp";
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
  const tech = analyzeTechnicals(candles1m.length ? candles1m : fallback);
  const tech5 = analyzeTechnicals(candles5m.length ? candles5m : fallback);

  const m1ScalpBlock =
    ctx.m1Scalp != null
      ? formatM1ScalpForAi(ctx.m1Scalp, tech, tech5)
      : undefined;

  const newsTitles = ctx.newsItems.map((n) => n.titleUz || n.title).slice(0, 12);

  const prompt = buildAiTradeSignalPrompt({
    price: ctx.gold.price,
    changePercent: ctx.gold.changePercent,
    high24h: ctx.gold.high24h,
    low24h: ctx.gold.low24h,
    tech,
    tech5m: tech5,
    m1ScalpBlock,
    newsAnalysis: ctx.newsAnalysis,
    newsTitles,
    drivers: ctx.drivers.map((d) => ({ name: d.name, changePercent: d.changePercent })),
    calendarHint: ctx.calendar?.hintUz ?? ctx.calendar?.eventNameUz ?? undefined,
    disciplineScore: ctx.disciplineScore,
  });

  try {
    const raw = await askClaude(SYSTEM_AI_TRADE_SIGNAL, prompt, 2048);
    const signal = parseAiTradeSignalJson(raw, ctx.gold.price);
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
