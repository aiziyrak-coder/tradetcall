import type { GoldNewsBundle, NewsItem } from "../../../../shared/types";
import { GlassCard } from "./GlassCard";

interface Props {
  news: GoldNewsBundle;
}

function NewsCol({ title, items }: { title: string; items: NewsItem[] }) {
  return (
    <GlassCard className="empire-card empire-card--news p-2.5">
      <p className="empire-card-title">{title}</p>
      <div className="empire-news-scroll">
        {items.length ? (
          items.slice(0, 15).map((n) => (
            <div key={n.id} className="empire-news-row">
              <span className="empire-news-row__dot" />
              <div className="min-w-0">
                {n.timeAgo && <span className="empire-news-row__time">{n.timeAgo}</span>}
                <p className="empire-news-row__text">{n.titleUz || n.title}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-[10px] italic opacity-40">Yuklanmoqda…</p>
        )}
      </div>
    </GlassCard>
  );
}

export function NewsPanels({ news }: Props) {
  return (
    <section className="empire-news-grid">
      <NewsCol title="OLTIN YANGILIKLARI" items={news.direct} />
      <NewsCol title="MAKRO TAHLIL" items={news.macro} />
      <NewsCol title="GEO SIYOSAT" items={news.geopolitics} />
    </section>
  );
}
