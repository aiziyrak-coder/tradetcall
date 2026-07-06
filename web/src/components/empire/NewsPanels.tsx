import { motion } from "framer-motion";
import type { GoldNewsBundle, NewsItem } from "../../../../shared/types";
import { GlassCard } from "./GlassCard";

interface Props {
  news: GoldNewsBundle;
}

function NewsCol({ title, items }: { title: string; items: NewsItem[] }) {
  return (
    <GlassCard className="empire-card empire-card--news flex min-h-0 flex-col p-3" float>
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <p className="empire-card-title mb-0">{title}</p>
        <button type="button" className="empire-view-all">
          VIEW ALL
        </button>
      </div>
      <div className="empire-news-scroll min-h-0 flex-1 overflow-y-auto">
        {items.length ? (
          items.slice(0, 7).map((n, i) => (
            <motion.div
              key={n.id}
              className="empire-news-row"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <span className="empire-news-row__dot" />
              <div className="min-w-0">
                {n.timeAgo && <span className="empire-news-row__time">{n.timeAgo}</span>}
                <p className="empire-news-row__text">{n.titleUz || n.title}</p>
              </div>
            </motion.div>
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
    <section className="empire-news-grid px-2 pb-2">
      <NewsCol title="🥇 OLTIN YANGILIKLARI" items={news.direct} />
      <NewsCol title="📊 MAKRO TAHLIL" items={news.macro} />
      <NewsCol title="🌍 GEO SIYOSAT" items={news.geopolitics} />
    </section>
  );
}
