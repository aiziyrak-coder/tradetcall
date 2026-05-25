import type { LongTermForecast, LongTermStrategy, ShortTermStrategy } from "../../../../shared/types";
import { buildSignalDetail } from "../../../../shared/signal-detail";
import { SignalHeroCompact } from "./SignalHeroCompact";
import { SignalChecklist } from "./SignalChecklist";
import { RiskCalculatorCompact } from "./RiskCalculatorCompact";

type LongDisplay = LongTermStrategy | LongTermForecast;

function longSignal(display: LongDisplay, price: number): LongTermStrategy["signal"] {
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

interface LongProps {
  strategy: LongTermStrategy | null;
  forecast: LongTermForecast | null;
  price: number;
  onForecast?: () => void;
  forecastLoading?: boolean;
  hasApiKey?: boolean;
}

export function LongStrategyBlock({ strategy, forecast, price, onForecast, forecastLoading, hasApiKey }: LongProps) {
  const display = forecast ?? strategy;
  if (!display) return <p className="text-[9px] text-[var(--term-muted)]">Uzoq muddat yuklanmoqda…</p>;

  const signal = forecast && strategy ? strategy.signal : longSignal(display, price);
  const pro = strategy;
  const fc = forecast;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-bold uppercase text-[var(--term-gold)]">Swing · 1 hafta+</span>
        {onForecast && (
          <button
            type="button"
            onClick={onForecast}
            disabled={forecastLoading || !hasApiKey}
            className="ml-auto rounded bg-amber-900/60 px-1.5 py-0 text-[7px] font-bold text-amber-200 disabled:opacity-40"
          >
            {forecastLoading ? "AI…" : "AI+"}
          </button>
        )}
      </div>
      <SignalHeroCompact signal={signal} bias={display.bias} confidence={display.confidence} />
      <SignalChecklist items={signal.checklist} />
      <RiskCalculatorCompact signal={signal} label="Swing" />
      {pro?.keyLevels && pro.keyLevels.length > 0 && (
        <div className="flex flex-wrap gap-0.5 font-mono-ui text-[7px]">
          {pro.keyLevels.map((k) => (
            <span key={k.label} className="rounded bg-zinc-900/80 px-1 py-0 text-zinc-400">
              {k.label} <b className="text-amber-200">${k.price}</b>
            </span>
          ))}
        </div>
      )}
      {fc ? (
        <>
          <p className="text-[8px] font-bold text-amber-300">{fc.summaryUz}</p>
          <p className="text-[8px] text-[var(--term-text-2)]">{fc.weekPlanUz}</p>
          <p className="text-[8px] text-red-300/90">{fc.riskWarning}</p>
        </>
      ) : (
        pro?.playbookUz && (
          <p className="rounded bg-amber-950/30 px-1.5 py-1 text-[8px] font-semibold leading-snug text-amber-100">
            {pro.playbookUz}
          </p>
        )
      )}
      <ul className="space-y-0.5">
        {(fc ? fc.keyFactors : pro?.tacticsUz ?? []).map((t, i) => (
          <li key={i} className="text-[8px] leading-snug text-[var(--term-text-2)]">
            <span className="text-[var(--term-gold)]">▸</span> {t}
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-0.5 font-mono-ui text-[8px]">
        <span>
          SL <b className="text-red-400">${display.stopLoss}</b>
        </span>
        <span>
          TP <b className="text-emerald-400">${display.takeProfit}</b>
        </span>
      </div>
    </div>
  );
}

interface ShortProps {
  strategy: ShortTermStrategy | null;
  price: number;
}

export function ShortStrategyBlock({ strategy, price }: ShortProps) {
  if (!strategy) return <p className="text-[9px] text-[var(--term-muted)]">Qisqa muddat yuklanmoqda…</p>;

  return (
    <div className="space-y-1">
      <span className="text-[9px] font-bold uppercase text-cyan-400">
        Scalp · 30 daqiqa · {strategy.tfAligned}/{strategy.tfTotal} TF
      </span>
      <SignalHeroCompact signal={strategy.signal} bias={strategy.bias} confidence={strategy.confidence} label="SCALP" />
      <SignalChecklist items={strategy.signal.checklist} />
      <RiskCalculatorCompact signal={strategy.signal} label="Scalp" />
      <div className="flex flex-wrap gap-0.5 font-mono-ui text-[7px]">
        {strategy.keyLevels.map((k) => (
          <span key={k.label} className="rounded bg-zinc-900/80 px-1 py-0 text-zinc-400">
            {k.label} <b className="text-cyan-200">${k.price}</b>
          </span>
        ))}
      </div>
      <p className="rounded bg-cyan-950/30 px-1.5 py-1 text-[8px] font-semibold leading-snug text-cyan-100">
        {strategy.playbookUz}
      </p>
      <ul className="space-y-0.5">
        {strategy.tacticsUz.map((t, i) => (
          <li key={i} className="text-[8px] leading-snug text-[var(--term-text-2)]">
            <span className="text-cyan-400">▸</span> {t}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-0.5">
        {strategy.timeframes.map((tf) => (
          <span
            key={tf.interval}
            className={`rounded px-1 py-0 text-[7px] font-bold ${
              tf.bias === "long"
                ? "bg-emerald-800 text-white"
                : tf.bias === "short"
                  ? "bg-red-800 text-white"
                  : "bg-zinc-700 text-zinc-400"
            }`}
          >
            {tf.labelUz.split(" ")[0]} {tf.bias === "long" ? "L" : tf.bias === "short" ? "S" : "—"}
          </span>
        ))}
      </div>
    </div>
  );
}
