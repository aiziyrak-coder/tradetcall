import { useState, type CSSProperties } from "react";
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

type NewsTab = "direct" | "macro" | "geo";

function parseScores(signal: AiTradeSignal | null | undefined) {
  const m = signal?.summaryUz.match(/L(\d+).*?S(\d+)/i);
  return { long: m ? Number(m[1]) : null, short: m ? Number(m[2]) : null };
}

function shortHint(text: string, price: number): string {
  if (!text) return "";
  const clean = text.replace(/\$?(\d{4,6}\.?\d*)/g, (match, num) => {
    const v = parseFloat(num);
    if (v > price * 1.15 || v < price * 0.85) return `$${price.toFixed(2)}`;
    return match.startsWith("$") ? match : `$${match}`;
  });
  return clean.length > 120 ? `${clean.slice(0, 117)}…` : clean;
}

function biasLabel(bias: string | undefined) {
  if (bias === "bullish") return { text: "LONG", cls: "nx-pill--long" };
  if (bias === "bearish") return { text: "SHORT", cls: "nx-pill--short" };
  return { text: "NEYTRAL", cls: "nx-pill--neutral" };
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
  const [newsTab, setNewsTab] = useState<NewsTab>("direct");
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
  const prob = signal?.winProbability ?? 0;
  const macro = biasLabel(analysis?.overallBias);
  const signalClass =
    action === "BUY" ? "nx-signal--buy" : action === "SELL" ? "nx-signal--sell" : "nx-signal--hold";

  const newsItems =
    newsTab === "direct" ? news.direct : newsTab === "macro" ? news.macro : news.geopolitics;

  const newsTabs: { id: NewsTab; label: string; count: number }[] = [
    { id: "direct", label: "Oltin", count: news.direct.length },
    { id: "macro", label: "Makro", count: news.macro.length },
    { id: "geo", label: "Geo", count: news.geopolitics.length },
  ];

  return (
    <div className="nexus-root">
      <NexusBackground />

      <header className="nx-topbar">
        <div className="nx-topbar__brand">
          <span className="nx-logo-mark">✦</span>
          <span className="nx-logo-text">OLTIN SIGNAL</span>
        </div>

        <div className="nx-topbar__status">
          <span className={`nx-live ${liveOk ? "nx-live--on" : ""}`}>
            {liveOk ? "JONLI" : "UZILDI"}
          </span>
          <span className="nx-topbar__time">{lastUpdate}</span>
          <span className="nx-topbar__session">{marketSession.nameUz}</span>
        </div>

        <div className="nx-topbar__user">
          <span>{username}</span>
          {onOpenSettings && (
            <button type="button" onClick={onOpenSettings}>
              {UZ.settings}
            </button>
          )}
          {isAdmin && onOpenAdmin && (
            <button type="button" onClick={onOpenAdmin}>
              Admin
            </button>
          )}
          <button type="button" className="nx-topbar__logout" onClick={onLogout}>
            {UZ.logout}
          </button>
        </div>
      </header>

      <div className="nx-main">
        <section className="nx-hero">
          <div className="nx-card nx-card--price">
            <p className="nx-card__eyebrow">XAUUSD · Oltin narxi</p>
            {gold ? (
              <div className="nx-price-block" key={`${gold.price}-${tickFlash}`}>
                <span className="nx-price">${gold.price.toFixed(2)}</span>
                <span className={`nx-price-change ${up ? "up" : "down"}`}>
                  {up ? "▲" : "▼"}{" "}
                  {Math.abs(gold.changePercent) >= 0.01
                    ? `${up ? "+" : ""}${gold.changePercent.toFixed(2)}%`
                    : `$${Math.abs(gold.change).toFixed(2)}`}
                </span>
              </div>
            ) : (
              <span className="nx-price">—</span>
            )}
            {gold?.high24h != null && (
              <div className="nx-price-range">
                <span>
                  24s yuqori <strong>${gold.high24h.toFixed(2)}</strong>
                </span>
                <span>
                  24s past <strong>${gold.low24h?.toFixed(2)}</strong>
                </span>
              </div>
            )}
          </div>

          <div className={`nx-card nx-card--signal ${signalClass}`}>
            {phase === "ready" && signal ? (
              <>
                <div className="nx-signal-head">
                  <div>
                    <p className="nx-card__eyebrow">AI prognoz</p>
                    <h2 className="nx-signal-action">{signal.action}</h2>
                    <p className="nx-signal-sub">
                      {signal.action === "BUY"
                        ? "Sotib olish"
                        : signal.action === "SELL"
                          ? "Sotish"
                          : "Kutish tavsiya"}
                    </p>
                  </div>
                  <div className="nx-prob-ring" style={{ "--nx-prob": `${prob}%` } as CSSProperties}>
                    <span className="nx-prob-ring__val">{prob}%</span>
                    <span className="nx-prob-ring__lbl">ishonch</span>
                  </div>
                </div>

                {(scores.long != null || scores.short != null) && (
                  <div className="nx-score-bars">
                    <div className="nx-score-bar">
                      <div className="nx-score-bar__head">
                        <span>Long</span>
                        <span>{scores.long ?? 0}</span>
                      </div>
                      <div className="nx-score-bar__track">
                        <div
                          className="nx-score-bar__fill nx-score-bar__fill--long"
                          style={{ width: `${scores.long ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="nx-score-bar">
                      <div className="nx-score-bar__head">
                        <span>Short</span>
                        <span>{scores.short ?? 0}</span>
                      </div>
                      <div className="nx-score-bar__track">
                        <div
                          className="nx-score-bar__fill nx-score-bar__fill--short"
                          style={{ width: `${scores.short ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {signal.action !== "HOLD" && (
                  <div className="nx-trade-levels">
                    <div>
                      <span>Stop</span>
                      <strong>${signal.stopLoss.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Kirish</span>
                      <strong>${signal.entry.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Maqsad</span>
                      <strong>${signal.takeProfit.toFixed(2)}</strong>
                    </div>
                  </div>
                )}

                {signal.triggerUz && (
                  <p className="nx-signal-note">{shortHint(signal.triggerUz, price)}</p>
                )}
              </>
            ) : analyzing ? (
              <div className="nx-signal-empty">
                <div className="nx-spinner" />
                <p>8 treyder tahlil qilmoqda…</p>
              </div>
            ) : (
              <div className="nx-signal-empty">
                <p className="nx-card__eyebrow">Prognoz yo'q</p>
                <p>Yangi tahlil uchun tugmani bosing</p>
                <button
                  type="button"
                  className="nx-btn-gold"
                  disabled={sessionBusy}
                  onClick={onRequestForecast}
                >
                  ▶ {UZ.monitorForecast}
                </button>
              </div>
            )}

            {!analyzing && phase === "ready" && (
              <button
                type="button"
                className="nx-btn-gold nx-btn-gold--ghost"
                disabled={sessionBusy}
                onClick={onRequestForecast}
              >
                {sessionBusy ? "Kutilmoqda…" : `↻ ${UZ.monitorForecast}`}
              </button>
            )}
          </div>

          <div className="nx-card nx-card--stats">
            <p className="nx-card__eyebrow">Bozor holati</p>

            <div className="nx-stat-pills">
              <span className={`nx-pill ${macro.cls}`}>
                Makro {macro.text} {analysis?.biasStrength ?? 0}%
              </span>
              {signal?.forecastBiasUz && (
                <span className="nx-pill nx-pill--neutral">{signal.forecastBiasUz}</span>
              )}
            </div>

            {analysis?.tradeVerdictUz && (
              <p className="nx-verdict-text">{analysis.tradeVerdictUz}</p>
            )}

            <div className="nx-stat-grid">
              <div className="nx-stat">
                <span>Trend</span>
                <strong
                  className={
                    tech?.trend === "bullish"
                      ? "up"
                      : tech?.trend === "bearish"
                        ? "down"
                        : ""
                  }
                >
                  {tech?.trend === "bullish"
                    ? "YUQORI"
                    : tech?.trend === "bearish"
                      ? "PAST"
                      : "NEYTRAL"}
                </strong>
              </div>
              <div className="nx-stat">
                <span>ADX</span>
                <strong>{tech?.adx ?? "—"}</strong>
              </div>
              <div className="nx-stat">
                <span>RSI</span>
                <strong>{tech?.rsi ?? "—"}</strong>
              </div>
              <div className="nx-stat">
                <span>Setup</span>
                <strong>{data?.setupQuality ? `${data.setupQuality.score}/100` : "—"}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="nx-card nx-card--news">
          <div className="nx-news-head">
            <h3>Yangiliklar</h3>
            <div className="nx-news-tabs">
              {newsTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={newsTab === t.id ? "active" : ""}
                  onClick={() => setNewsTab(t.id)}
                >
                  {t.label}
                  {t.count > 0 && <em>{t.count}</em>}
                </button>
              ))}
            </div>
            {translating && <span className="nx-translating">{UZ.translating}</span>}
          </div>

          <ul className="nx-news-list">
            {newsItems.length ? (
              newsItems.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <span className="nx-news-dot" />
                  <span>{n.titleUz || n.title}</span>
                </li>
              ))
            ) : (
              <li className="nx-news-empty">Yangiliklar yuklanmoqda…</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
