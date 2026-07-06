import { useState } from "react";
import type { AiPhase, AiTradeSignal } from "../../../../shared/ai-trade-signal";
import type { MonitorSessionInfo, MonitorSnapshot } from "../../../../shared/types";
import { getMarketSession } from "../../../../shared/market-session";
import { UZ } from "../../lib/uz";
import { NexusBackground } from "./NexusBackground";

interface Props {
  username: string;
  data: MonitorSnapshot | null;
  aiPhase: AiPhase;
  session: MonitorSessionInfo | null;
  sessionBusy: boolean;
  lastUpdate: string;
  liveOk: boolean;
  tickFlash: number;
  translating: boolean;
  onRequestForecast: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

function parseScores(signal: AiTradeSignal | null | undefined) {
  const m = signal?.summaryUz.match(/L(\d+).*?S(\d+)/i);
  return { long: m ? Number(m[1]) : null, short: m ? Number(m[2]) : null };
}

export function NexusTerminal({
  username,
  data,
  aiPhase,
  session,
  sessionBusy,
  lastUpdate,
  liveOk,
  tickFlash,
  translating,
  onRequestForecast,
  onOpenSettings,
  onLogout,
  isAdmin,
  onOpenAdmin,
}: Props) {
  const [newsOpen, setNewsOpen] = useState(false);
  const marketSession = getMarketSession();
  const signal = data?.aiSignal ?? null;
  const gold = data?.gold;
  const tech = data?.marketTechnical;
  const analysis = data?.newsAnalysis;
  const news = data?.news ?? { direct: [], macro: [], geopolitics: [] };
  const phase = aiPhase ?? session?.phase ?? "idle";
  const analyzing = phase === "analyzing";
  const scores = parseScores(signal);
  const up = (gold?.change ?? 0) >= 0;
  const action = signal?.action ?? (phase === "idle" ? null : "HOLD");
  const oracleClass =
    action === "BUY" ? "nx-oracle--buy" : action === "SELL" ? "nx-oracle--sell" : "nx-oracle--hold";

  return (
    <div className="nexus-root relative flex h-full min-h-0 flex-col overflow-hidden">
      <NexusBackground />

      <header className="nx-header relative z-10 shrink-0">
        <span className="nx-logo">NEXUS GOLD</span>
        {analyzing ? (
          <span className="font-nexus text-[10px] text-cyan-400 animate-pulse">SCANNING...</span>
        ) : (
          <button
            type="button"
            className="nx-btn-prognoz"
            disabled={sessionBusy}
            onClick={onRequestForecast}
          >
            {sessionBusy ? "..." : `▶ ${UZ.monitorForecast}`}
          </button>
        )}
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {liveOk ? <span className="nx-live-dot" /> : <span className="text-amber-500">○</span>}
          <span className="font-nx-mono">{lastUpdate}</span>
          <span>{marketSession.nameUz}</span>
        </div>
        {signal && phase === "ready" && (
          <span className="font-nexus rounded border border-cyan-500/30 px-2 py-0.5 text-[9px] text-cyan-300">
            {signal.action}
            {signal.winProbability != null ? ` ${signal.winProbability}%` : ""}
          </span>
        )}
        {translating && <span className="text-[9px] text-cyan-400">{UZ.translating}</span>}
        <div className="ml-auto flex items-center gap-3 text-[10px]">
          <span className="text-slate-500">{username}</span>
          {onOpenSettings && (
            <button type="button" onClick={onOpenSettings} className="text-cyan-400 hover:text-cyan-300">
              {UZ.settings}
            </button>
          )}
          {isAdmin && onOpenAdmin && (
            <button type="button" onClick={onOpenAdmin} className="text-amber-400/80">
              Admin
            </button>
          )}
          <button type="button" onClick={onLogout} className="text-red-400/80">
            {UZ.logout}
          </button>
        </div>
      </header>

      <main className="nx-cockpit relative z-10 min-h-0 flex-1">
        {/* Signal Oracle */}
        <div className="nx-glass relative flex min-h-0 flex-col">
          {phase === "ready" && signal ? (
            <>
              <div className={`nx-oracle ${oracleClass}`}>
                <div className="nx-oracle__halo" />
                <span className="nx-oracle__action">{signal.action}</span>
                <span className="nx-oracle__sub">
                  {signal.action === "BUY"
                    ? "SOTIB OLISH"
                    : signal.action === "SELL"
                      ? "SOTISH"
                      : "KUTISH"}
                </span>
                {signal.winProbability != null && (
                  <span className="nx-oracle__prob">~{signal.winProbability}% ehtimol</span>
                )}
                {(scores.long != null || scores.short != null) && (
                  <div className="nx-oracle__scores">
                    <span className="long">LONG {scores.long ?? "—"}</span>
                    <span className="short">SHORT {scores.short ?? "—"}</span>
                  </div>
                )}
              </div>
              {signal.action !== "HOLD" && (
                <div className="nx-levels">
                  <div className="nx-level nx-level--sl">
                    <span className="nx-level__tag">STOP</span>
                    <span className="nx-level__val">${signal.stopLoss.toFixed(2)}</span>
                  </div>
                  <div className="nx-level nx-level--en">
                    <span className="nx-level__tag">KIRISH</span>
                    <span className="nx-level__val">${signal.entry.toFixed(2)}</span>
                  </div>
                  <div className="nx-level nx-level--tp">
                    <span className="nx-level__tag">MAQSAD</span>
                    <span className="nx-level__val">${signal.takeProfit.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div className="nx-hint">{signal.triggerUz}</div>
            </>
          ) : analyzing ? (
            <div className="nx-oracle nx-oracle--hold flex-1">
              <div className="nx-oracle__halo" style={{ animationDuration: "2s" }} />
              <span className="nx-oracle__action text-cyan-400">...</span>
              <span className="nx-oracle__sub">8 TREYDER TAHLILI</span>
            </div>
          ) : (
            <div className="nx-oracle nx-oracle--hold flex-1">
              <span className="nx-oracle__action text-slate-600">—</span>
              <span className="nx-oracle__sub">PROGNOZ UCHUN TUGMA</span>
              <button type="button" className="nx-btn-prognoz mt-4" onClick={onRequestForecast}>
                ▶ {UZ.monitorForecast}
              </button>
            </div>
          )}
        </div>

        {/* Price Core */}
        <div className="nx-glass nx-price-core relative">
          <div className="nx-price-core__frame" />
          <span className="nx-price-core__label">XAUUSD · OLTIN</span>
          {gold ? (
            <div key={`${gold.price}-${tickFlash}`}>
              <span
                className={`nx-price-core__value ${up ? "nx-price-core__value--up" : "nx-price-core__value--down"}`}
              >
                ${gold.price.toFixed(2)}
              </span>
              <span className={`nx-price-core__delta ${up ? "text-emerald-400" : "text-red-400"}`}>
                {up ? "▲" : "▼"}{" "}
                {Math.abs(gold.changePercent) >= 0.01
                  ? `${up ? "+" : ""}${gold.changePercent.toFixed(2)}%`
                  : `$${Math.abs(gold.change).toFixed(2)}`}
              </span>
            </div>
          ) : (
            <span className="nx-price-core__value">—</span>
          )}
          {signal?.forecastBiasUz && (
            <span className="nx-price-core__bias">{signal.forecastBiasUz}</span>
          )}
          {gold?.high24h != null && (
            <div className="mt-4 flex gap-6 font-nx-mono text-[11px] text-slate-500">
              <span>
                H <span className="text-emerald-400">${gold.high24h.toFixed(2)}</span>
              </span>
              <span>
                L <span className="text-red-400">${gold.low24h?.toFixed(2)}</span>
              </span>
            </div>
          )}
        </div>

        {/* Intel Rail */}
        <div className="nx-glass nx-metrics min-h-0 overflow-y-auto">
          {tech && (
            <>
              <div className="nx-metric">
                <span className="nx-metric__label">Trend</span>
                <span className={`nx-metric__value ${tech.trend === "bullish" ? "text-emerald-400" : tech.trend === "bearish" ? "text-red-400" : ""}`}>
                  {tech.trend === "bullish" ? "YUQORI" : tech.trend === "bearish" ? "PAST" : "NEYTRAL"}
                </span>
              </div>
              <div className="nx-metric">
                <span className="nx-metric__label">ADX kuch</span>
                <span className="nx-metric__value text-cyan-300">{tech.adx}</span>
                <div className="nx-metric-bar w-full col-span-2">
                  <div className="nx-metric-bar__fill" style={{ width: `${Math.min(100, tech.adx)}%` }} />
                </div>
              </div>
              <div className="nx-metric">
                <span className="nx-metric__label">RSI</span>
                <span className="nx-metric__value">{tech.rsi}</span>
              </div>
            </>
          )}
          {analysis && (
            <div className="nx-metric" style={{ borderColor: analysis.overallBias === "bullish" ? "var(--nx-green)" : analysis.overallBias === "bearish" ? "var(--nx-red)" : "var(--nx-gold)" }}>
              <span className="nx-metric__label">Makro</span>
              <span className="nx-metric__value uppercase">
                {analysis.overallBias} {analysis.biasStrength}%
              </span>
            </div>
          )}
          {data?.setupQuality && (
            <div className="nx-metric">
              <span className="nx-metric__label">Setup</span>
              <span className="nx-metric__value">{data.setupQuality.score}/100</span>
            </div>
          )}
          {signal?.invalidationUz && (
            <p className="text-[10px] leading-snug text-amber-200/70 px-1">{signal.invalidationUz}</p>
          )}
        </div>
      </main>

      <button
        type="button"
        className="nx-news-toggle relative z-10 shrink-0"
        onClick={() => setNewsOpen((o) => !o)}
      >
        {newsOpen ? "▼" : "▲"} YANGILIKLAR · MAKRO · GEO
      </button>

      <div className={`nx-news-panel relative z-10 shrink-0 ${newsOpen ? "nx-news-panel--open" : ""}`}>
        <div className="nx-news-col">
          <p className="nx-news-col__title">🥇 OLTIN</p>
          {news.direct.slice(0, 6).map((n) => (
            <p key={n.id} className="nx-news-item">
              {n.titleUz || n.title}
            </p>
          ))}
        </div>
        <div className="nx-news-col">
          <p className="nx-news-col__title">📊 MAKRO</p>
          {news.macro.slice(0, 6).map((n) => (
            <p key={n.id} className="nx-news-item">
              {n.titleUz || n.title}
            </p>
          ))}
        </div>
        <div className="nx-news-col">
          <p className="nx-news-col__title">🌍 GEO</p>
          {news.geopolitics.slice(0, 6).map((n) => (
            <p key={n.id} className="nx-news-item">
              {n.titleUz || n.title}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
