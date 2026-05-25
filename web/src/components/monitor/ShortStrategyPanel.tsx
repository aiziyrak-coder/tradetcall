import type { NewsMarketAnalysis, ShortTermStrategy } from "../../../../shared/types";
import { UZ } from "../../lib/uz";
import { PanelShell } from "./PanelShell";
import { PriceLevelsVisual } from "./PriceLevelsVisual";
import { SignalChecklist } from "./SignalChecklist";
import { SignalHero } from "./SignalHero";

interface Props {
  strategy: ShortTermStrategy | null;
  currentPrice: number;
  newsAnalysis?: NewsMarketAnalysis | null;
}

const tfChip: Record<string, string> = {
  long: "bg-emerald-600 text-white",
  short: "bg-red-600 text-white",
  neutral: "bg-zinc-600 text-zinc-300",
};

const trendUz: Record<string, string> = {
  bullish: "↑ Ko'tarilish",
  bearish: "↓ Tushish",
  neutral: "→ Yon",
};

export function ShortStrategyPanel({ strategy, currentPrice, newsAnalysis }: Props) {
  if (!strategy) {
    return (
      <PanelShell title={UZ.short.title} subtitle="30 daqiqa lot" accent="cyan">
        <p className="py-8 text-center text-[12px] text-[var(--term-muted)]">Yuklanmoqda…</p>
      </PanelShell>
    );
  }

  const { signal } = strategy;
  const tech = strategy.technical;

  return (
    <PanelShell
      title={UZ.short.title}
      subtitle={`${strategy.maxHoldMinutes} daq · 1m 5m 15m 1h`}
      accent="cyan"
      badge={
        <span className="rounded bg-cyan-900/60 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
          TEZ
        </span>
      }
    >
      <div className="space-y-3">
        <SignalHero signal={signal} bias={strategy.bias} confidence={strategy.confidence} />

        {currentPrice > 0 && <PriceLevelsVisual currentPrice={currentPrice} signal={signal} />}

        <SignalChecklist
          items={[
            ...signal.checklist,
            ...(newsAnalysis
              ? [
                  {
                    ok: newsAnalysis.newsCandleAligned,
                    textUz: "Yangiliklar shamlar bilan mos",
                  },
                  {
                    ok: !newsAnalysis.contradictionsUz,
                    textUz: newsAnalysis.contradictionsUz ?? "Zidlik yo'q",
                  },
                ]
              : []),
          ]}
        />

        <div className="rounded-lg border border-amber-500/30 bg-amber-950/25 p-2.5">
          <p className="text-[10px] font-bold text-amber-400">{UZ.short.lotRule}</p>
          <p className="mt-1 text-[11px] leading-snug text-amber-100/90">{strategy.lotRuleUz}</p>
          <p className="mt-2 font-mono-ui text-[12px] font-bold text-[var(--term-cyan)]">
            Chiqish vaqti: {strategy.exit.whenUz}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--term-border)] bg-[var(--term-bg)] p-2.5">
          <p className="mb-2 text-[10px] font-bold uppercase text-[var(--term-cyan)]">
            {UZ.short.tfTitle} ({strategy.tfAligned}/{strategy.tfTotal} mos)
          </p>
          <div className="space-y-1.5">
            {strategy.timeframes.map((tf) => (
              <div
                key={tf.interval}
                className="grid grid-cols-[72px_1fr_auto] items-center gap-2 rounded-md border border-[var(--term-border)] bg-black/20 px-2 py-1.5"
              >
                <span className="text-[11px] font-semibold">{tf.labelUz}</span>
                <span className="text-[10px] text-[var(--term-muted)]">
                  {trendUz[tf.trend]} · RSI {tf.rsi}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-center text-[9px] font-black uppercase ${tfChip[tf.bias]}`}
                >
                  {tf.bias === "neutral" ? "KUT" : tf.bias === "long" ? "OL" : "SOT"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--term-border)] p-2.5 text-[11px]">
          <p className="font-bold text-[var(--term-gold)]">{UZ.short.techTitle}</p>
          <p className="mt-1">
            RSI {tech.rsi} · {tech.trend} · SMA20 {tech.sma20}
          </p>
          <p className="text-[10px] text-red-400/90 mt-2">{strategy.invalidationUz}</p>
        </div>
      </div>
    </PanelShell>
  );
}
