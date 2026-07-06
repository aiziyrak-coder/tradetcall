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

function saneHint(text: string, price: number): string {
  if (!text) return "";
  return text.replace(/\$?(\d{4,6}\.?\d*)/g, (match, num) => {
    const v = parseFloat(num);
    if (v > price * 1.15 || v < price * 0.85) return `$${price.toFixed(2)}`;
    return match.startsWith("$") ? match : `$${match}`;
  });
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
  const marketSession = getMarketSession();
  const signal = data?.aiSignal ?? null;
  const gold = data?.gold;
  const price = gold?.price ?? 0;
  const tech = data?.marketTechnical;
  const analysis = data?.newsAnalysis;
  const news = data?.news ?? { direct: [], macro: [], geopolitics: [] };
  const phase = aiPhase ?? session?.phase ?? "idle";
  const analyzing = phase === "analyzing";
  const scores = parseScores(signal);
  const up = (gold?.change ?? 0) >= 0;
  const action = signal?.action ?? null;
  const oracleClass =
    action === "BUY" ? "nx-oracle--buy" : action === "SELL" ? "nx-oracle--sell" : "nx-oracle--hold";

  return (
    <div className="nexus-root relative flex h-full min-h-0 flex-col overflow-hidden">
      <NexusBackground />

      <header className="nx-header relative z-10 shrink-0">
        <span className="nx-logo">✦ OLTIN SIGNAL</span>
        {analyzing ? (
          <span className="font-nexus text-[11px] text-[var(--nx-gold)] animate-pulse">Tahlil...</span>
        ) : (
          <button
            type="button"
            className="nx-btn-prognoz"
            disabled={sessionBusy}
            onClick={onRequestForecast}
          >
            {sessionBusy ? "…" : `▶ ${UZ.monitorForecast}`}
          </button>
        )}
        <div className="flex items-center gap-2 text-[11px] text-[var(--nx-cream-dim)]">
          {liveOk ? <span className="nx-live-dot" /> : <span className="text-amber-600">○</span>}
          <span className="font-nx-mono">{lastUpdate}</span>
          <span>{marketSession.nameUz}</span>
        </div>
        {signal && phase === "ready" && (
          <span className="nx-badge">
            {signal.action}
            {signal.winProbability != null ? ` ${signal.winProbability}%` : ""}
          </span>
        )}
        {translating && <span className="text-[10px] text-[var(--nx-gold)]">{UZ.translating}</span>}
        <div className="ml-auto flex items-center gap-3 text-[11px]">
          <span className="text-[var(--nx-muted)]">{username}</span>
          {onOpenSettings && (
            <button type="button" onClick={onOpenSettings} className="text-[var(--nx-gold)] hover:brightness-110">
              {UZ.settings}
            </button>
          )}
          {isAdmin && onOpenAdmin && (
            <button type="button" onClick={onOpenAdmin} className="text-[var(--nx-cream-dim)]">
              Admin
            </button>
          )}
          <button type="button" onClick={onLogout} className="text-red-400/90">
            {UZ.logout}
          </button>
        </div>
      </header>

      <div className="nx-body relative z-10 min-h-0 flex-1">
        <main className="nx-cockpit min-h-0">
          {/* Signal */}
          <div className="nx-glass flex min-h-0 flex-col">
            {phase === "ready" && signal ? (
              <>
                <div className={`nx-oracle ${oracleClass}`}>
                  <div className="nx-oracle__ring nx-oracle__ring--outer" />
                  <div className="nx-oracle__ring nx-oracle__ring--inner" />
                  <span className="nx-oracle__action">{signal.action}</span>
                  <span className="nx-oracle__sub">
                    {signal.action === "BUY" ? "SOTIB OLISH" : signal.action === "SELL" ? "SOTISH" : "KUTISH"}
                  </span>
                  {signal.winProbability != null && (
                    <span className="nx-oracle__prob">~{signal.winProbability}% ehtimol</span>
                  )}
                  {(scores.long != null || scores.short != null) && (
                    <div className="nx-oracle__scores">
                      <span className="long">L {scores.long ?? "—"}</span>
                      <span className="short">S {scores.short ?? "—"}</span>
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
                <div className="nx-hint">{saneHint(signal.triggerUz, price)}</div>
              </>
            ) : analyzing ? (
              <div className="nx-oracle nx-oracle--hold flex-1">
                <div className="nx-analyze-spinner" />
                <span className="nx-oracle__sub mt-3">8 treyder tahlili</span>
              </div>
            ) : (
              <div className="nx-oracle nx-oracle--hold flex-1">
                <span className="nx-oracle__action" style={{ fontSize: "1.5rem", opacity: 0.5 }}>
                  —
                </span>
                <span className="nx-oracle__sub">Prognoz uchun tugma</span>
                <button type="button" className="nx-btn-prognoz mt-4" onClick={onRequestForecast}>
                  ▶ {UZ.monitorForecast}
                </button>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="nx-glass nx-price-core">
            <span className="nx-price-core__label">XAUUSD · OLTIN</span>
            {gold ? (
              <div key={`${gold.price}-${tickFlash}`}>
                <span className="nx-price-core__value">${gold.price.toFixed(2)}</span>
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
            {(signal?.forecastBiasUz || analysis?.overallBias) && (
              <span className="nx-price-core__bias">
                {signal?.forecastBiasUz ??
                  (analysis?.overallBias === "bullish"
                    ? "↑ LONG"
                    : analysis?.overallBias === "bearish"
                      ? "↓ SHORT"
                      : "— NEYTRAL")}
              </span>
            )}
            {gold?.high24h != null && (
              <div className="nx-price-core__hl">
                <span>
                  Yuqori <span className="text-emerald-400">${gold.high24h.toFixed(2)}</span>
                </span>
                <span>
                  Past <span className="text-red-400">${gold.low24h?.toFixed(2)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Intel */}
          <div className="nx-glass nx-metrics">
            {analysis && (
              <div className="nx-verdict">
                <strong className="text-[var(--nx-gold)]">
                  {analysis.overallBias === "bullish"
                    ? "↑ LONG"
                    : analysis.overallBias === "bearish"
                      ? "↓ SHORT"
                      : "—"}{" "}
                  {analysis.biasStrength}%
                </strong>
                <p className="mt-1 text-[10px] opacity-90">
                  {analysis.tradeVerdictUz ?? analysis.recommendationUz}
                </p>
              </div>
            )}
            {tech && (
              <>
                <div className="nx-metric">
                  <div className="nx-metric__row">
                    <span className="nx-metric__label">Trend</span>
                    <span
                      className={`nx-metric__value ${tech.trend === "bullish" ? "text-emerald-400" : tech.trend === "bearish" ? "text-red-400" : ""}`}
                    >
                      {tech.trend === "bullish" ? "YUQORI" : tech.trend === "bearish" ? "PAST" : "NEYTRAL"}
                    </span>
                  </div>
                </div>
                <div className="nx-metric">
                  <div className="nx-metric__row">
                    <span className="nx-metric__label">ADX kuch</span>
                    <span className="nx-metric__value text-[var(--nx-gold-bright)]">{tech.adx}</span>
                  </div>
                  <div className="nx-metric-bar">
                    <div className="nx-metric-bar__fill" style={{ width: `${Math.min(100, tech.adx)}%` }} />
                  </div>
                </div>
                <div className="nx-metric">
                  <div className="nx-metric__row">
                    <span className="nx-metric__label">RSI</span>
                    <span className="nx-metric__value">{tech.rsi}</span>
                  </div>
                </div>
              </>
            )}
            {data?.setupQuality && (
              <div className="nx-metric">
                <div className="nx-metric__row">
                  <span className="nx-metric__label">Setup</span>
                  <span className="nx-metric__value">{data.setupQuality.score}/100</span>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Yangiliklar — doim ochiq */}
        <section className="nx-news-section min-h-0">
          <div className="nx-news-col">
            <p className="nx-news-col__title">🥇 OLTIN YANGILIKLARI</p>
            {news.direct.length ? (
              news.direct.slice(0, 12).map((n) => (
                <p key={n.id} className="nx-news-item">
                  {n.titleUz || n.title}
                </p>
              ))
            ) : (
              <p className="nx-news-empty">Yuklanmoqda...</p>
            )}
          </div>
          <div className="nx-news-col">
            <p className="nx-news-col__title">📊 MAKRO TAHLIL</p>
            {news.macro.length ? (
              news.macro.slice(0, 12).map((n) => (
                <p key={n.id} className="nx-news-item">
                  {n.titleUz || n.title}
                </p>
              ))
            ) : (
              <p className="nx-news-empty">Yuklanmoqda...</p>
            )}
          </div>
          <div className="nx-news-col">
            <p className="nx-news-col__title">🌍 GEO SIYOSAT</p>
            {news.geopolitics.length ? (
              news.geopolitics.slice(0, 12).map((n) => (
                <p key={n.id} className="nx-news-item">
                  {n.titleUz || n.title}
                </p>
              ))
            ) : (
              <p className="nx-news-empty">Yuklanmoqda...</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
