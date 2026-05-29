import type { M1ScalpLead } from "../../../../shared/m1-scalp";
import type { LiveMomentum } from "../../../../shared/scalp-signal-guard";
import type { SetupQuality } from "../../../../shared/setup-quality";
import type { PriceData, TechnicalAnalysis } from "../../../../shared/types";
import { RsiGauge } from "./RsiGauge";
import { TermCard } from "./TermCard";

interface Props {
  technical: TechnicalAnalysis | null | undefined;
  m1Scalp?: M1ScalpLead | null;
  liveMomentum?: LiveMomentum | null;
  setupQuality?: SetupQuality | null;
  gold: PriceData | null;
}

const trendStyle = {
  bullish: "text-emerald-400",
  bearish: "text-red-400",
  neutral: "text-amber-300",
};

const trendLabel = {
  bullish: "YUQORI",
  bearish: "PAST",
  neutral: "NEYTRAL",
};

const gradeStyle: Record<string, string> = {
  A: "text-emerald-400 border-emerald-500/50",
  B: "text-cyan-300 border-cyan-500/50",
  C: "text-amber-400 border-amber-500/50",
  D: "text-red-400 border-red-500/50",
};

const phaseStyle: Record<string, string> = {
  forming: "text-violet-300",
  active: "text-emerald-400",
  exhausted: "text-amber-400",
  reversal: "text-orange-400",
  range: "text-slate-400",
};

export function TechnicalIndicatorsPanel({
  technical,
  m1Scalp,
  liveMomentum,
  setupQuality,
  gold,
}: Props) {
  const price = gold?.price ?? 0;
  const e = technical?.enhanced;

  return (
    <TermCard title="Indikatorlar" subtitle="MACD · BB · ADX · setup sifati" accent="cyan">
      <div className="p-2">
        {setupQuality && (
          <div
            className={`mb-2 rounded border px-2 py-1 ${gradeStyle[setupQuality.grade] ?? gradeStyle.C}`}
          >
            <p className="text-[8px] font-black">
              Setup {setupQuality.score}/100 — {setupQuality.gradeUz}
            </p>
            <p className="text-[7px] opacity-90">
              {setupQuality.tradeAllowed ? "✓ Savdo mumkin" : "✗ Hozir kirmang"}
              {" · L"}
              {setupQuality.longScore} / S{setupQuality.shortScore}
            </p>
          </div>
        )}

        {!technical ? (
          <p className="text-[8px] text-amber-400">Shamlar yuklanmoqda…</p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[9px]">
              <span>
                Trend{" "}
                <span className={`font-black ${trendStyle[technical.trend]}`}>
                  {trendLabel[technical.trend]}
                </span>
              </span>
              <span>
                ADX <span className="font-mono-ui font-bold">{technical.adx}</span>
              </span>
              {e && (
                <span>
                  Kuch <span className="font-bold text-violet-300">{e.trendStrength}%</span>
                </span>
              )}
            </div>

            <RsiGauge rsi={technical.rsi} />

            {e && (
              <div className="grid grid-cols-2 gap-1 text-[8px]">
                <span className="rounded bg-black/30 px-1 py-0.5">
                  MACD <b className={e.macdBias === "bullish" ? "text-emerald-400" : e.macdBias === "bearish" ? "text-red-400" : ""}>{e.macdBias}</b> ({e.macdHist})
                </span>
                <span className="rounded bg-black/30 px-1 py-0.5">
                  BB {e.bbPositionPct}%
                </span>
                <span className="rounded bg-black/30 px-1 py-0.5 col-span-2">
                  EMA9 ${e.ema9} · EMA21 ${e.ema21} · hajm {e.volumeBias}
                </span>
              </div>
            )}

            <p className="text-[8px] leading-snug text-slate-400">{technical.momentum}</p>

            {liveMomentum && liveMomentum.direction !== "flat" && (
              <p
                className={`text-[8px] font-bold ${
                  liveMomentum.direction === "up" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {liveMomentum.summaryUz}
              </p>
            )}

            {m1Scalp && (
              <div className="rounded border border-violet-500/30 bg-violet-950/25 p-1.5">
                <p className="text-[7px] font-bold uppercase text-violet-300">M1 yo&apos;nalish</p>
                <p className="text-[9px] font-black text-white">
                  {m1Scalp.direction.toUpperCase()} · {m1Scalp.strength}%
                  <span className={`ml-1 font-semibold ${phaseStyle[m1Scalp.phase] ?? ""}`}>
                    {m1Scalp.phase}
                  </span>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-emerald-900/30 bg-emerald-950/15 p-1.5">
                <p className="text-[7px] font-bold text-emerald-400">Qo&apos;llab-quvvatlash</p>
                {technical.support.slice(0, 2).map((p, i) => (
                  <p key={i} className="font-mono-ui text-[8px] text-emerald-300/90">
                    ${p.toFixed(2)}
                  </p>
                ))}
              </div>
              <div className="rounded border border-red-900/30 bg-red-950/15 p-1.5">
                <p className="text-[7px] font-bold text-red-400">Qarshilik</p>
                {technical.resistance.slice(0, 2).map((p, i) => (
                  <p key={i} className="font-mono-ui text-[8px] text-red-300/90">
                    ${p.toFixed(2)}
                  </p>
                ))}
              </div>
            </div>

            {setupQuality && setupQuality.warningsUz.length > 0 && (
              <p className="text-[7px] text-amber-400">⚠ {setupQuality.warningsUz[0]}</p>
            )}
          </div>
        )}
      </div>
    </TermCard>
  );
}
