import type {
  LongTermForecast,
  LongTermStrategy,
  NewsMarketAnalysis,
} from "../../../../shared/types";
import { buildSignalDetail } from "../../../../shared/signal-detail";
import { PanelShell } from "./PanelShell";
import { SignalHeroCompact } from "./SignalHeroCompact";

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
  return buildSignalDetail(price, display.bias, from, to, display.takeProfit, display.stopLoss, display.takeProfit, display.confidence, 50, 8);
}

export function StrategyPanelCompact({
  strategy,
  forecast,
  forecastLoading,
  hasApiKey,
  currentPrice,
  onForecast,
}: Props) {
  const display = forecast ?? strategy;
  if (!display) {
    return (
      <PanelShell compact title="UZOQ" accent="gold">
        <p className="text-center text-[9px] text-[var(--term-muted)]">…</p>
      </PanelShell>
    );
  }

  const signal = getSignal(display, currentPrice || 0);

  return (
    <PanelShell
      compact
      title="UZOQ MUDDAT"
      subtitle="Swing"
      accent="gold"
      footer={
        <button
          type="button"
          onClick={onForecast}
          disabled={forecastLoading || !hasApiKey}
          className="term-btn-gold w-full rounded py-1 text-[8px] disabled:opacity-50"
        >
          {forecastLoading ? "AI…" : "AI prognoz"}
        </button>
      }
    >
      <div className="space-y-1.5">
        <SignalHeroCompact signal={signal} bias={display.bias} confidence={display.confidence} />
        <p className="line-clamp-3 text-[9px] leading-snug text-[var(--term-text-2)]">{display.situationUz}</p>
        <div className="flex flex-wrap gap-0.5">
          {signal.checklist.slice(0, 5).map((c, i) => (
            <span
              key={i}
              className={`rounded px-1 py-0 text-[7px] ${c.ok ? "bg-emerald-900/60 text-emerald-200" : "bg-red-950/50 text-red-300"}`}
            >
              {c.ok ? "✓" : "✗"} {c.textUz.slice(0, 28)}
            </span>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
