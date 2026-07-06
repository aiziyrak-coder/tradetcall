import { motion } from "framer-motion";
import type { GoldNewsBundle } from "../../../../shared/types";
import { GlassCard } from "./GlassCard";

interface Props {
  news: GoldNewsBundle;
}

function NewsCol({ title, items }: { title: string; items: GoldNewsBundle["direct"] }) {
  return (
    <GlassCard className="flex min-h-0 flex-col p-3" float>
      <p className="mb-2 shrink-0 font-['Syncopate'] text-[9px] font-bold tracking-[0.12em] text-[#ffd54a]">
        {title}
      </p>
      <div className="empire-news-scroll min-h-0 flex-1 overflow-y-auto">
        {items.length ? (
          items.slice(0, 8).map((n, i) => (
            <motion.p
              key={n.id}
              className="mb-2 flex gap-2 text-[10px] leading-snug text-[rgba(255,232,139,0.55)]"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ x: 4, color: "rgba(255,232,139,0.85)" }}
            >
              <span
                className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#ffd54a]"
                style={{ boxShadow: "0 0 6px rgba(255,213,74,0.6)" }}
              />
              <span>{n.titleUz || n.title}</span>
            </motion.p>
          ))
        ) : (
          <p className="text-[10px] italic text-[rgba(255,232,139,0.3)]">Yuklanmoqda…</p>
        )}
      </div>
    </GlassCard>
  );
}

export function NewsPanels({ news }: Props) {
  return (
    <motion.section
      className="grid min-h-0 shrink-0 grid-cols-3 gap-2 px-2 pb-2"
      style={{ maxHeight: "22%" }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <NewsCol title="🥇 OLTIN YANGILIKLARI" items={news.direct} />
      <NewsCol title="📊 MAKRO TAHLIL" items={news.macro} />
      <NewsCol title="🌍 GEO SIYOSAT" items={news.geopolitics} />
    </motion.section>
  );
}
