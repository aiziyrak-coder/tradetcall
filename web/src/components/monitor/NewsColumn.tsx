import type { NewsItem } from "../../../../shared/types";
import { openUrl } from "../../lib/openUrl";
import { UZ } from "../../lib/uz";

interface Props {
  title: string;
  subtitle?: string;
  icon: string;
  items: NewsItem[];
  accent?: string;
  highlight?: boolean;
  compact?: boolean;
  maxItems?: number;
}

const sentColor = {
  bullish: "text-emerald-400",
  bearish: "text-red-400",
  neutral: "text-zinc-500",
};

function quickSentiment(item: NewsItem): "bullish" | "bearish" | "neutral" {
  const t = `${item.title} ${item.summary}`.toLowerCase();
  if (/surge|rally|rise|bull|safe haven|rate cut|weak dollar|buying/i.test(t)) return "bullish";
  if (/fall|drop|bear|plunge|rate hike|strong dollar/i.test(t)) return "bearish";
  return "neutral";
}

export function NewsColumn({
  title,
  subtitle,
  icon,
  items,
  accent = "text-[var(--term-gold)]",
  highlight,
  compact,
  maxItems = 99,
}: Props) {
  const shown = items.slice(0, maxItems);

  return (
    <div
      className={`flex h-full min-h-0 flex-col border-r border-[var(--term-border)] last:border-r-0 ${
        highlight ? "bg-[var(--term-panel-2)]/40" : ""
      }`}
    >
      <div className={`shrink-0 border-b border-[var(--term-border)] ${compact ? "px-1 py-0.5" : "px-2 py-1.5"} ${accent}`}>
        <div className="flex items-center justify-between gap-1">
          <span className={`truncate font-semibold ${compact ? "text-[8px]" : "text-[10px]"}`}>
            {icon} {title}
          </span>
          <span className="shrink-0 text-[8px] font-normal text-[var(--term-muted)]">{items.length}</span>
        </div>
        {subtitle && !compact && (
          <p className="mt-0.5 truncate text-[9px] font-normal text-[var(--term-muted)]">{subtitle}</p>
        )}
      </div>
      <div className={compact ? "min-h-0 flex-1 overflow-hidden" : "term-scroll min-h-0 flex-1"}>
        {items.length === 0 ? (
          <p className={`text-center text-[var(--term-muted)] ${compact ? "p-1 text-[8px]" : "p-2 text-[10px]"}`}>
            {UZ.news.loading}
          </p>
        ) : (
          shown.map((item) => {
            const sent = quickSentiment(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openUrl(item.link)}
                className={`block w-full border-b border-[var(--term-border)]/50 text-left transition hover:bg-[var(--term-panel-2)] ${
                  compact ? "px-1 py-0.5" : "px-2 py-2"
                }`}
              >
                <div className="flex justify-between gap-1">
                  <span className={`truncate font-medium text-[var(--term-cyan)] ${compact ? "text-[7px]" : "text-[9px]"}`}>
                    {item.source}
                  </span>
                  <span className={`shrink-0 font-bold ${sentColor[sent]} ${compact ? "text-[7px]" : "text-[9px]"}`}>
                    {sent === "bullish" ? "↑" : sent === "bearish" ? "↓" : "·"}
                  </span>
                </div>
                <p
                  className={`font-medium leading-snug text-[var(--term-text)] ${
                    compact ? "line-clamp-2 text-[8px]" : "mt-0.5 line-clamp-2 text-[11px]"
                  }`}
                >
                  {item.titleUz || item.title}
                </p>
                {!item.titleUz && (
                  <span className="text-[7px] text-amber-400">tarjima kutilmoqda…</span>
                )}
                {!compact && (item.goldImpactUz || item.summaryUz) && (
                  <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-[var(--term-muted)]">
                    {item.goldImpactUz ?? item.summaryUz?.slice(0, 120)}
                  </p>
                )}
                {item.alert && (
                  <span className="mt-0.5 inline-block text-[9px] font-semibold text-[var(--term-red)]">
                    {UZ.news.alert}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
