import type { CSSProperties } from "react";
import type { AiPhase, AiTradeSignal } from "../../../../shared/ai-trade-signal";
import type { MonitorSessionInfo, MonitorSnapshot, PriceData } from "../../../../shared/types";
import { getMarketSession } from "../../../../shared/market-session";
import { UZ } from "../../lib/uz";
import { NexusBackground } from "./NexusBackground";
import { GoldSphere } from "./GoldSphere";
import { ForecastChart } from "./ForecastChart";

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

function shortHint(text: string, price: number): string {
  if (!text) return "";
  const clean = text.replace(/\$?(\d{4,6}\.?\d*)/g, (match, num) => {
    const v = parseFloat(num);
    if (v > price * 1.15 || v < price * 0.85) return `$${price.toFixed(2)}`;
    return match.startsWith("$") ? match : `$${match}`;
  });
  return clean.length > 140 ? `${clean.slice(0, 137)}…` : clean;
}

function priceChangeLabel(gold: PriceData) {
  const up = gold.change >= 0;
  const tick = gold.tickDelta ?? 0;
  if (Math.abs(tick) >= 0.01) {
    return { text: `${tick >= 0 ? "+" : "−"}$${Math.abs(tick).toFixed(2)}`, up: tick >= 0 };
  }
  if (Math.abs(gold.changePercent) >= 0.01) {
    return { text: `${up ? "+" : ""}${gold.changePercent.toFixed(2)}%`, up };
  }
  return { text: `${up ? "+" : "−"}$${Math.abs(gold.change).toFixed(2)}`, up };
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
  const action = signal?.action ?? null;
  const prob = signal?.winProbability ?? signal?.confidence ?? 0;
  const tickSeq = data?.tickSeq;
  const oracleClass =
    action === "BUY" ? "nx-oracle--buy" : action === "SELL" ? "nx-oracle--sell" : "nx-oracle--hold";

  const macroBias = analysis?.overallBias;
  const macroLabel =
    macroBias === "bullish" ? "Bullish" : macroBias === "bearish" ? "Bearish" : "Neytral";
  const macroCls =
    macroBias === "bullish" ? "bull" : macroBias === "bearish" ? "bear" : "neutral";

  const change = gold ? priceChangeLabel(gold) : null;
  const tickerHeadline =
    news.direct[0]?.titleUz || news.direct[0]?.title || news.macro[0]?.titleUz || "Bozor kuzatilmoqda…";

  return (
    <div className="nexus-root">
      <NexusBackground />

      <header className="nx-header">
        <div className="nx-header__left">
          <span className="nx-logo">✦ OLTIN SIGNAL</span>
          {analyzing ? (
            <span className="nx-header__analyzing">Tahlil…</span>
          ) : (
            <button
              type="button"
              className="nx-btn-prognoz"
              disabled={sessionBusy}
              onClick={onRequestForecast}
            >
              ▶ {UZ.monitorForecast}
            </button>
          )}
        </div>

        <div className="nx-header__center">
          <span className={`nx-live-pill ${liveOk ? "on" : ""}`}>{liveOk ? "●" : "○"}</span>
          <span className="nx-header__clock">{lastUpdate}</span>
          {tickSeq != null && <span className="nx-header__seq">#{tickSeq}</span>}
          <span className="nx-header__session">{marketSession.nameUz}</span>
          {signal && phase === "ready" && (
            <span className="nx-header__badge">
              {signal.action} {prob}%
            </span>
          )}
        </div>

        <div className="nx-header__right">
          <span className="nx-header__user">{username.toUpperCase()}</span>
          {onOpenSettings && (
            <button type="button" onClick={onOpenSettings}>
              {UZ.settings.toUpperCase()}
            </button>
          )}
          {isAdmin && onOpenAdmin && (
            <button type="button" onClick={onOpenAdmin}>
              ADMIN
            </button>
          )}
          <button type="button" className="nx-header__out" onClick={onLogout}>
            {UZ.logout.toUpperCase()}
          </button>
        </div>
      </header>

      <div className="nx-body">
        <aside className="nx-side nx-side--left">
          <div className={`nx-panel nx-oracle ${oracleClass}`}>
            {phase === "ready" && signal ? (
              <>
                <div className="nx-oracle__ring-wrap">
                  <div className="nx-oracle__ring nx-oracle__ring--1" />
                  <div className="nx-oracle__ring nx-oracle__ring--2" />
                  <div className="nx-oracle__core">
                    <span className="nx-oracle__action">{signal.action}</span>
                    <span className="nx-oracle__wait">
                      {signal.action === "BUY" ? "SOTIB OLISH" : signal.action === "SELL" ? "SOTISH" : "KUTISH"}
                    </span>
                    <span className="nx-oracle__prob">~{prob}% ehtimol</span>
                  </div>
                </div>
                {signal.triggerUz && (
                  <p className="nx-oracle__hint">{shortHint(signal.triggerUz, price)}</p>
                )}
              </>
            ) : analyzing ? (
              <div className="nx-oracle__empty">
                <div className="nx-spinner" />
                <p>8 treyder tahlili</p>
              </div>
            ) : (
              <div className="nx-oracle__empty">
                <p className="nx-oracle__action" style={{ opacity: 0.4 }}>
                  —
                </p>
                <p>Prognoz uchun tugma</p>
                <button type="button" className="nx-btn-prognoz" onClick={onRequestForecast}>
                  ▶ {UZ.monitorForecast}
                </button>
              </div>
            )}
          </div>

          <div className="nx-panel nx-strength">
            <p className="nx-panel__title">SIGNAL KUCHI</p>
            <div className="nx-strength__val">{prob}%</div>
            <div className="nx-strength__chart">
              <svg viewBox="0 0 200 50" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="nx-str" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#c9a227" />
                    <stop offset="100%" stopColor="#ffe082" />
                  </linearGradient>
                </defs>
                <path
                  d={`M0,40 Q30,${45 - prob * 0.3} 60,${35 - prob * 0.2} T120,${30 - prob * 0.25} T200,${20 - prob * 0.15}`}
                  fill="none"
                  stroke="url(#nx-str)"
                  strokeWidth="2.5"
                  className="nx-strength__line"
                />
              </svg>
            </div>
          </div>

          <div className="nx-panel nx-sentiment">
            <p className="nx-panel__title">BOZOR HOLATI</p>
            <div className={`nx-sentiment__icon nx-sentiment__icon--${macroCls}`}>
              {macroCls === "bull" ? "🐂" : macroCls === "bear" ? "🐻" : "⚖"}
            </div>
            <p className={`nx-sentiment__label nx-sentiment__label--${macroCls}`}>{macroLabel}</p>
          </div>
        </aside>

        <main className="nx-center">
          <div className="nx-sphere-wrap">
            <GoldSphere />
            <div className="nx-sphere-overlay">
              <p className="nx-sphere-label">XAUUSD · OLTIN</p>
              {gold ? (
                <div
                  key={`${gold.price}-${tickFlash}`}
                  className={`nx-sphere-price ${change?.up ? "up" : "down"} nx-price-tick`}
                >
                  <span className="nx-sphere-price__val">${gold.price.toFixed(2)}</span>
                  {change && (
                    <span className={`nx-sphere-price__chg ${change.up ? "up" : "down"}`}>
                      {change.up ? "▲" : "▼"} {change.text}
                    </span>
                  )}
                </div>
              ) : (
                <span className="nx-sphere-price__val">—</span>
              )}
              {(signal?.forecastBiasUz || analysis?.overallBias) && (
                <span
                  className={`nx-bias-pill ${
                    macroBias === "bullish" ? "long" : macroBias === "bearish" ? "short" : ""
                  }`}
                >
                  {signal?.forecastBiasUz ??
                    (macroBias === "bullish" ? "↑ LONG" : macroBias === "bearish" ? "↓ SHORT" : "— NEYTRAL")}
                </span>
              )}
            </div>
          </div>
        </main>

        <aside className="nx-side nx-side--right">
          <div className="nx-panel nx-verdict-panel">
            <div className="nx-verdict-panel__head">
              <span className="nx-verdict-panel__icon">🚀</span>
              <div>
                <strong
                  className={
                    macroBias === "bullish" ? "long" : macroBias === "bearish" ? "short" : ""
                  }
                >
                  {macroBias === "bullish"
                    ? `LONG ${analysis?.biasStrength ?? 0}%`
                    : macroBias === "bearish"
                      ? `SHORT ${analysis?.biasStrength ?? 0}%`
                      : `NEYTRAL ${analysis?.biasStrength ?? 0}%`}
                </strong>
                {analysis?.tradeVerdictUz && (
                  <p>{analysis.tradeVerdictUz}</p>
                )}
              </div>
            </div>
          </div>

          <div className="nx-panel nx-indicators">
            {tech && (
              <>
                <div className="nx-ind">
                  <div className="nx-ind__row">
                    <span>TREND</span>
                    <span
                      className={
                        tech.trend === "bullish" ? "long" : tech.trend === "bearish" ? "short" : ""
                      }
                    >
                      {tech.trend === "bullish" ? "YUQORI" : tech.trend === "bearish" ? "PAST" : "NEYTRAL"}
                    </span>
                  </div>
                  <div className="nx-ind__bar">
                    <div
                      className="nx-ind__fill"
                      style={{
                        width: `${tech.trend === "bullish" ? 75 : tech.trend === "bearish" ? 25 : 50}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="nx-ind">
                  <div className="nx-ind__row">
                    <span>ADX KUCH</span>
                    <span>{tech.adx}</span>
                  </div>
                  <div className="nx-ind__bar">
                    <div className="nx-ind__fill" style={{ width: `${Math.min(100, tech.adx)}%` }} />
                  </div>
                </div>
                <div className="nx-ind">
                  <div className="nx-ind__row">
                    <span>RSI</span>
                    <span>{tech.rsi}</span>
                  </div>
                  <div className="nx-ind__bar">
                    <div className="nx-ind__fill" style={{ width: `${tech.rsi}%` }} />
                  </div>
                </div>
              </>
            )}
            {data?.setupQuality && (
              <div className="nx-ind">
                <div className="nx-ind__row">
                  <span>SETUP</span>
                  <span>{data.setupQuality.score}/100</span>
                </div>
                <div className="nx-ind__bar">
                  <div
                    className="nx-ind__fill"
                    style={{ width: `${data.setupQuality.score}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="nx-panel nx-confidence">
            <p className="nx-panel__title">UMUMIY ISHONCH</p>
            <div className="nx-conf-ring" style={{ "--nx-p": `${prob}%` } as CSSProperties}>
              <span>{prob}%</span>
            </div>
          </div>

          <div className="nx-panel nx-forecast-panel">
            <p className="nx-panel__title">PROGNOZ</p>
            <ForecastChart signal={signal} price={price} />
            {signal && signal.action !== "HOLD" && (
              <div className="nx-forecast-levels">
                <span className="sl">SL ${signal.stopLoss.toFixed(2)}</span>
                <span className="tp">TP ${signal.takeProfit.toFixed(2)}</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      <section className="nx-news-row">
        <div className="nx-news-col">
          <p className="nx-news-col__title">🥇 OLTIN YANGILIKLARI</p>
          {news.direct.slice(0, 6).map((n) => (
            <p key={n.id} className="nx-news-item">
              <span className={`nx-news-dot ${n.sentiment === "bullish" ? "up" : n.sentiment === "bearish" ? "down" : ""}`} />
              {n.titleUz || n.title}
            </p>
          ))}
        </div>
        <div className="nx-news-col">
          <p className="nx-news-col__title">📊 MAKRO TAHLIL</p>
          {news.macro.slice(0, 6).map((n) => (
            <p key={n.id} className="nx-news-item">
              <span className="nx-news-dot" />
              {n.titleUz || n.title}
            </p>
          ))}
        </div>
        <div className="nx-news-col">
          <p className="nx-news-col__title">🌍 GEO SIYOSAT</p>
          {news.geopolitics.slice(0, 6).map((n) => (
            <p key={n.id} className="nx-news-item">
              <span className="nx-news-dot" />
              {n.titleUz || n.title}
            </p>
          ))}
        </div>
      </section>

      <footer className="nx-footer">
        <span className="nx-footer__pair">
          XAU/USD {gold ? `${gold.changePercent >= 0 ? "+" : ""}${gold.changePercent.toFixed(2)}%` : "—"}
        </span>
        <div className="nx-footer__ticker">
          <span>{tickerHeadline}</span>
        </div>
        <span className={`nx-footer__status ${liveOk ? "on" : ""}`}>
          SERVER {liveOk ? "ONLINE" : "OFFLINE"}
        </span>
        <span className="nx-footer__time">YANGILANDI: {lastUpdate}</span>
        {translating && <span className="nx-footer__trans">{UZ.translating}</span>}
      </footer>
    </div>
  );
}
