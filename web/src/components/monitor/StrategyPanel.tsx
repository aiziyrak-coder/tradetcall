import type {
  LongTermForecast,
  LongTermStrategy,
  NewsMarketAnalysis,
} from "../../../../shared/types";
import { buildSignalDetail } from "../../../../shared/signal-detail";
import { UZ } from "../../lib/uz";
import { PanelShell } from "./PanelShell";
import { PriceLevelsVisual } from "./PriceLevelsVisual";
import { SignalChecklist } from "./SignalChecklist";
import { SignalHero } from "./SignalHero";

interface Props {
  strategy: LongTermStrategy | null;
  forecast: LongTermForecast | null;
  forecastLoading: boolean;
  hasApiKey: boolean;
  currentPrice: number;
  newsAnalysis?: NewsMarketAnalysis | null;
  onForecast: () => void;
}

function getSignal(
  display: LongTermStrategy | LongTermForecast,
  price: number
): LongTermStrategy["signal"] {
  if ("signal" in display && display.signal) return display.signal as LongTermStrategy["signal"];
  const from = display.entry.priceFrom ?? price - 5;
  const to = display.entry.priceTo ?? price + 5;
  return buildSignalDetail(
    price,
    display.bias,
    from,
    to,
    display.takeProfit,
    display.stopLoss,
    display.takeProfit,
    display.confidence,
    50,
    8
  );
}

export function StrategyPanel({
  strategy,
  forecast,
  forecastLoading,
  hasApiKey,
  currentPrice,
  newsAnalysis,
  onForecast,
}: Props) {
  const display = forecast ?? strategy;
  const tech = strategy?.technical;

  if (!display) {
    return (
      <PanelShell title={UZ.long.title} subtitle="Kun / hafta savdo">
        <p className="py-8 text-center text-[12px] text-[var(--term-muted)]">Yuklanmoqda…</p>
      </PanelShell>
    );
  }

  const signal = getSignal(display, currentPrice || strategy?.signal.entryPrice || 0);

  return (
    <PanelShell
      title={UZ.long.title}
      subtitle="Swing · pozitsion · 1 hafta+"
      accent="gold"
      badge={
        <span className="rounded bg-amber-900/60 px-2 py-0.5 text-[10px] font-bold text-amber-300">
          UZOQ
        </span>
      }
      footer={
        <button
          type="button"
          onClick={onForecast}
          disabled={forecastLoading || !hasApiKey}
          className="term-btn-gold w-full rounded-lg py-2.5 text-[11px] disabled:opacity-50"
        >
          {forecastLoading ? "AI tahlil…" : UZ.long.aiBtn}
        </button>
      }
    >
      <div className="space-y-3">
        <SignalHero signal={signal} bias={display.bias} confidence={display.confidence} />

        {currentPrice > 0 && <PriceLevelsVisual currentPrice={currentPrice} signal={signal} />}

        <SignalChecklist
          items={[
            ...signal.checklist,
            ...(newsAnalysis
              ? [
                  {
                    ok: newsAnalysis.overallBias !== "neutral",
                    textUz: `Yangiliklar: ${newsAnalysis.overallBias} (${newsAnalysis.biasStrength}%)`,
                  },
                  {
                    ok: newsAnalysis.newsCandleAligned,
                    textUz: newsAnalysis.newsCandleAligned
                      ? "Yangilik + shamlar mos"
                      : "Yangilik va shamlar zid yoki noaniq",
                  },
                  {
                    ok: !newsAnalysis.contradictionsUz,
                    textUz: newsAnalysis.contradictionsUz
                      ? "Zid signal bor — ehtiyot"
                      : "Zid signal yo'q",
                  },
                ]
              : []),
          ]}
        />

        <div className="rounded-lg border border-[var(--term-border)] bg-[var(--term-bg)] p-2.5 space-y-2">
          <p className="text-[10px] font-bold uppercase text-[var(--term-gold)]">{UZ.long.situation}</p>
          <p className="text-[12px] leading-relaxed text-[var(--term-text)]">{display.situationUz}</p>
          <div className="border-t border-[var(--term-border)] pt-2">
            <p className="text-[11px] font-bold text-[var(--term-cyan)]">{display.entry.title}</p>
            <p className="text-[11px] text-[var(--term-text-2)]">{display.entry.whenUz}</p>
            <p className="font-mono-ui text-[12px] font-semibold text-[var(--term-gold)]">
              {display.entry.priceHint}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-[var(--term-cyan)]">{display.exit.title}</p>
            <p className="text-[11px] text-[var(--term-text-2)]">{display.exit.whenUz}</p>
            <p className="font-mono-ui text-[12px] font-semibold text-emerald-400/90">
              {display.exit.priceHint}
            </p>
          </div>
          <p className="text-[10px] text-red-400/90">
            <span className="font-bold">{UZ.long.invalid}: </span>
            {display.invalidationUz}
          </p>
          {"weekPlanUz" in display && display.weekPlanUz && (
            <p className="rounded border border-cyan-500/25 bg-cyan-950/30 p-2 text-[11px]">
              <span className="font-bold text-cyan-400">Hafta: </span>
              {display.weekPlanUz}
            </p>
          )}
        </div>

        {tech && (
          <div className="rounded-lg border border-[var(--term-border)] p-2.5 text-[11px]">
            <p className="font-bold text-[var(--term-gold)]">{UZ.long.techTitle}</p>
            <p className="mt-1 text-[var(--term-text-2)]">
              RSI <b>{tech.rsi}</b> · {tech.trend} · SMA20 {tech.sma20} · SMA50 {tech.sma50}
            </p>
            <p className="text-[var(--term-muted)]">{tech.momentum}</p>
            <p className="mt-1 font-mono-ui text-[10px]">
              Qo'llab-quvvatlash: ${tech.support.join(", $")} · Qarshilik: $
              {tech.resistance.join(", $")}
            </p>
          </div>
        )}

        {!hasApiKey && (
          <p className="text-center text-[11px] text-amber-500">{UZ.long.noApi}</p>
        )}
      </div>
    </PanelShell>
  );
}
