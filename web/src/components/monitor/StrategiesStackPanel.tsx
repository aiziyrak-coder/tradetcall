import type { LongTermForecast, LongTermStrategy, ShortTermStrategy } from "../../../../shared/types";
import { LongStrategyBlock, ShortStrategyBlock } from "./StrategyBlockPro";

interface Props {
  longStrategy: LongTermStrategy | null;
  shortStrategy: ShortTermStrategy | null;
  forecast: LongTermForecast | null;
  forecastLoading: boolean;
  hasApiKey: boolean;
  price: number;
  onForecast: () => void;
}

export function StrategiesStackPanel({
  longStrategy,
  shortStrategy,
  forecast,
  forecastLoading,
  hasApiKey,
  price,
  onForecast,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-amber-500/30 bg-[var(--term-panel)]">
      <div className="shrink-0 border-b border-[var(--term-border)] bg-[var(--term-panel-2)] px-2 py-1">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-[var(--term-gold)]">
          Strategiyalar
        </h2>
        <p className="text-[8px] text-[var(--term-muted)]">Uzoq + qisqa · professional playbook</p>
      </div>
      <div className="term-scroll min-h-0 flex-1 px-2 py-1.5">
        <LongStrategyBlock
          strategy={longStrategy}
          forecast={forecast}
          price={price}
          onForecast={onForecast}
          forecastLoading={forecastLoading}
          hasApiKey={hasApiKey}
        />
        <ShortStrategyBlock strategy={shortStrategy} price={price} />
      </div>
    </div>
  );
}
