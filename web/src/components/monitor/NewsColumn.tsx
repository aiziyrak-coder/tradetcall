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
}: Props) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col border-r border-[var(--term-border)] last:border-r-0 ${
        highlight ? "bg-[var(--term-panel-2)]/40" : ""
      }`}
    >
      <div className={`shrink-0 border-b border-[var(--term-border)] px-2 py-1.5 ${accent}`}>
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-[10px] font-semibold">
            {icon} {title}
          </span>
          <span className="shrink-0 text-[9px] font-normal text-[var(--term-muted)]">
            {items.length}
          </span>
        </div>
        {subtitle && (
          <p className="mt-0.5 truncate text-[9px] font-normal text-[var(--term-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="term-scroll min-h-0 flex-1">
        {items.length === 0 ? (
          <p className="p-2 text-center text-[10px] text-[var(--term-muted)]">{UZ.news.loading}</p>
        ) : (
          items.map((item) => {
            const sent = quickSentiment(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openUrl(item.link)}
                className="block w-full border-b border-[var(--term-border)]/50 px-2 py-2 text-left transition hover:bg-[var(--term-panel-2)]"
              >
                <div className="flex justify-between gap-1">
                  <span className="truncate text-[9px] font-medium text-[var(--term-cyan)]">
                    {item.source}
                  </span>
                  <span className={`shrink-0 text-[9px] font-bold ${sentColor[sent]}`}>
                    {sent === "bullish" ? "↑" : sent === "bearish" ? "↓" : "·"}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-[var(--term-text)]">
                  {item.titleUz ?? item.title}
                </p>
                {(item.goldImpactUz || item.summaryUz) && (
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
