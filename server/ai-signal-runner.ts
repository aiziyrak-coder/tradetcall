import { analyzeTechnicalsFull } from "../shared/enhanced-technical";
import { AI_MAX_OUTPUT_TOKENS } from "../shared/ai-config";
import {
  buildCompactAiTradeSignalPrompt,
} from "../shared/compact-prompt";
import {
  SYSTEM_AI_ENRICH_ONLY,
  buildManifestContextBlock,
} from "../shared/ai-manifest";
import { parseAiTradeSignalJson } from "../shared/prompts";
import { askOpenAI } from "../shared/openai";
import { setApiKey as setLlmKey } from "../shared/openai";
import { getLiveMomentum, guardScalpAiSignal } from "../shared/scalp-signal-guard";
import { enforceSwingTargets } from "../shared/pip-targets";
import { computeSetupQuality } from "../shared/setup-quality";
import { shouldBlockAiForecast } from "../shared/profit-protection";
import { buildProAiSignal } from "../shared/pro-ai-signal";
import type { AiTradeSignal, SignalMode } from "../shared/ai-trade-signal";
import type { Candle } from "../shared/types";
import { completeAiSession, failAiSession } from "./ai-session";
import { getApiKey } from "./store";
import {
  getLastSnapshot,
  getMonitorContextForAi,
  refreshNewsDeepAnalysis,
  ensureCandlesForAnalysis,
} from "./monitor-service";
import { emitMonitorEvent } from "./events";
import { recordSignalIfNew, getJournalStats } from "./signal-journal-store";
import { clearPause } from "./shield-runtime";

/** OpenAI faqat A/B darajali setupda chaqiriladi */
const AI_ENRICH_MIN_WIN_PROB = 58;

export async function runOneShotAiAnalysis(mode: SignalMode = "swing"): Promise<void> {
  const key = getApiKey();
  if (!key?.trim()) {
    failAiSession("API kalit yo'q — Sozlamalarda OpenAI kalitini kiriting");
    broadcastUpdate();
    return;
  }

  setLlmKey(key);
  clearPause();

  await refreshNewsDeepAnalysis();
  const candlesOk = await ensureCandlesForAnalysis();
  const ctx = getMonitorContextForAi();
  if (!ctx.gold) {
    failAiSession("Narx mavjud emas — internet yoki serverni tekshiring");
    broadcastUpdate();
    return;
  }
  if (!candlesOk) {
    failAiSession("Shamlar yuklanmadi — birozdan keyin qayta urinib ko'ring");
    broadcastUpdate();
    return;
  }

  const snap = getLastSnapshot();
  let capitalBlock: { block: boolean; reasonUz: string; warningUz?: string } = {
    block: false,
    reasonUz: "",
  };
  if (snap?.platform) {
    capitalBlock = shouldBlockAiForecast({
      capitalShield: snap.platform.capitalShield,
      discipline: snap.platform.discipline,
      marketQuality: snap.platform.marketQuality,
    });
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

  if (capitalBlock.block) {
    const pro = buildProAiSignal({
      price: ctx.gold.price,
      multiCandles: ctx.multiCandles,
      drivers: ctx.drivers,
      news: ctx.newsAnalysis,
      impulse: ctx.impulse,
      journalStats: getJournalStats(),
      mode,
    });
    completeAiSession({
      ...pro.signal,
      action: "HOLD",
      confidence: Math.min(pro.signal.confidence, 45),
      summaryUz: `HOLD — ${capitalBlock.reasonUz}`,
      analysisUz: `${pro.signal.analysisUz}\nKapital himoyasi: ${capitalBlock.reasonUz}`,
    });
    broadcastUpdate();
    return;
  }

  const pro = buildProAiSignal({
    price: ctx.gold.price,
    multiCandles: ctx.multiCandles,
    drivers: ctx.drivers,
    news: ctx.newsAnalysis,
    impulse: ctx.impulse,
    journalStats: getJournalStats(),
    mode,
  });

  let signal = pro.signal;
  console.log(
    "[ai-signal] PRO:",
    mode,
    signal.action,
    `win~${pro.winProbability}%`,
    pro.grade,
    `L${pro.master.longScore}/S${pro.master.shortScore}`
  );

  const shouldEnrichWithAi =
    pro.winProbability >= AI_ENRICH_MIN_WIN_PROB &&
    signal.action !== "HOLD" &&
    pro.gateAllowed &&
    (pro.grade === "A+" || pro.grade === "A" || pro.grade === "B");

  if (shouldEnrichWithAi) {
    try {
      const manifestBlock = buildManifestContextBlock({
        proAction: signal.action,
        winProbability: pro.winProbability,
        grade: pro.grade,
        gradeUz: pro.gradeUz,
        panelUz: pro.master.panelUz,
        longScore: pro.master.longScore,
        shortScore: pro.master.shortScore,
        confluencePct: pro.master.confluencePct,
        gateAllowed: pro.gateAllowed,
      });
      const prompt = buildCompactAiTradeSignalPrompt({
        price: ctx.gold.price,
        changePercent: ctx.gold.changePercent,
        high24h: ctx.gold.high24h,
        low24h: ctx.gold.low24h,
        tech,
        tech5,
        setupScore: setupQ.score,
        longScore: setupQ.longScore,
        shortScore: setupQ.shortScore,
        m1Scalp: ctx.m1Scalp,
        live,
        news: ctx.newsAnalysis,
        suggestedAction: signal.action === "HOLD" ? null : signal.action,
        forecastHigh: signal.forecastHigh,
        forecastLow: signal.forecastLow,
        suggestedTp: signal.takeProfit,
        suggestedSl: signal.stopLoss,
        disciplineScore: ctx.disciplineScore,
        capitalShieldOk: ctx.capitalShieldOk,
        calendarHint: ctx.calendar?.hintUz,
        drivers: ctx.drivers,
        newsTitles: ctx.newsItems?.slice(0, 15).map((n) => n.titleUz || n.title),
      });
      const proContext = `\n\n${manifestBlock}`;
      const raw = await askOpenAI(
        SYSTEM_AI_ENRICH_ONLY,
        prompt + proContext,
        AI_MAX_OUTPUT_TOKENS
      );
      const parsed = parseAiTradeSignalJson(raw, ctx.gold.price);
      signal = mergeProWithAi(pro.signal, parsed, pro);
      console.log("[ai-signal] OpenAI enriched:", parsed.action, "→ final:", signal.action);
    } catch (e) {
      console.warn("[ai-signal] OpenAI enrich skipped:", e);
    }
  }

  signal = applyFinalGuards(signal, {
    c1,
    price: ctx.gold.price,
    changePercent: ctx.gold.changePercent,
    impulse: ctx.impulse,
    tech1: tech,
    m1Scalp: ctx.m1Scalp,
    tech5,
    mode,
  });

  const extra = [capitalBlock.warningUz].filter(Boolean).join(" · ");
  if (extra) {
    signal = { ...signal, analysisUz: `${signal.analysisUz}\n${extra}`.trim() };
  }

  completeAiSession(signal);
  recordIfTrade(signal, ctx.gold.price);
  broadcastUpdate();
}

/** Pro signal ustun — AI faqat tahlil matnini boyitadi */
function mergeProWithAi(
  pro: AiTradeSignal,
  ai: AiTradeSignal,
  ctx: ReturnType<typeof buildProAiSignal>
): AiTradeSignal {
  if (pro.action === "HOLD") return pro;

  if (ai.action === pro.action) {
    return {
      ...pro,
      confidence: Math.round((pro.confidence * 0.6 + ai.confidence * 0.4)),
      analysisUz: [pro.analysisUz, ai.analysisUz].filter(Boolean).join("\n").slice(0, 900),
      triggerUz: ai.triggerUz?.length > 15 ? ai.triggerUz : pro.triggerUz,
      invalidationUz: ai.invalidationUz?.length > 10 ? ai.invalidationUz : pro.invalidationUz,
      summaryUz: `${pro.action} — yutish ~${pro.winProbability}% · ${ctx.grade} · ${ai.summaryUz?.slice(0, 80) ?? pro.summaryUz}`,
    };
  }

  if (ai.action === "HOLD") {
    // Zaif PRO ni HOLD ga tushirish
    if ((ctx.winProbability ?? 50) < 62) {
      return {
        ...pro,
        action: "HOLD",
        confidence: Math.min(pro.confidence, 44),
        winProbability: Math.min(pro.winProbability ?? 50, 42),
        summaryUz: `HOLD — OpenAI ehtiyot: ${ai.summaryUz?.slice(0, 80) ?? "setup zaif"}`,
        analysisUz: `${pro.analysisUz}\n[OpenAI HOLD] ${ai.summaryUz}`.slice(0, 900),
      };
    }
    return {
      ...pro,
      analysisUz: `${pro.analysisUz}\n[OpenAI ehtiyot] ${ai.summaryUz}`.slice(0, 900),
    };
  }

  // Zid yo'nalish — HECH QACHON AI ga o'tkazilmaydi (PRO ustun)
  return {
    ...pro,
    analysisUz: `${pro.analysisUz}\n[AI zid ${ai.action} rad etildi — panel ${pro.action}]`.slice(0, 900),
  };
}

function applyFinalGuards(
  signal: AiTradeSignal,
  ctx: {
    c1: Candle[];
    price: number;
    changePercent: number;
    impulse: ReturnType<typeof getMonitorContextForAi>["impulse"];
    tech1: ReturnType<typeof analyzeTechnicalsFull>;
    m1Scalp: ReturnType<typeof getMonitorContextForAi>["m1Scalp"];
    tech5: ReturnType<typeof analyzeTechnicalsFull>;
    mode: SignalMode;
  }
): AiTradeSignal {
  if (signal.action === "HOLD") return signal;

  const guarded = guardScalpAiSignal(signal, {
    candles1m: ctx.c1,
    price: ctx.price,
    changePercent: ctx.changePercent,
    tech1: ctx.tech1,
    m1Scalp: ctx.m1Scalp,
    impulse: ctx.impulse,
    mode: ctx.mode,
  });

  let s = guarded.signal;
  if (s.action === "HOLD") {
    return {
      ...s,
      winProbability: Math.min(s.winProbability ?? 50, 42),
      summaryUz: s.summaryUz?.startsWith("HOLD")
        ? s.summaryUz
        : `HOLD — ${guarded.reasonUz ?? "jonli momentum teskari"}`,
    };
  }

  // Past ADX — HOLD emas, faqat foiz cheklovi (balans)
  if ((ctx.tech1.adx || 0) > 0 && (ctx.tech1.adx || 0) < 15) {
    s = {
      ...s,
      confidence: Math.min(s.confidence, 56),
      winProbability: Math.min(s.winProbability ?? 60, 56),
      signalGrade: s.signalGrade === "A+" || s.signalGrade === "A" ? "B" : s.signalGrade,
    };
  }

  // Scalp — tor targetlar saqlanadi, swing majburlash yo'q
  if (ctx.mode === "scalp") {
    return {
      ...s,
      mode: signal.mode,
      modeLabelUz: signal.modeLabelUz,
      holdTimeUz: signal.holdTimeUz,
      winProbability: signal.winProbability,
      confluencePct: signal.confluencePct,
      signalGrade: signal.signalGrade,
      panelUz: signal.panelUz,
    };
  }

  const swing = enforceSwingTargets(s, ctx.price, ctx.tech5);
  return {
    ...swing.signal,
    mode: signal.mode,
    modeLabelUz: signal.modeLabelUz,
    holdTimeUz: signal.holdTimeUz,
    winProbability: signal.winProbability,
    confluencePct: signal.confluencePct,
    signalGrade: signal.signalGrade,
    panelUz: signal.panelUz,
  };
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
