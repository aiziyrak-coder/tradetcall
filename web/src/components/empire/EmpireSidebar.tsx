import { motion } from "framer-motion";

const icons = ["◈", "◇", "◆", "▣", "◎", "⬡", "◉"];

export function EmpireSidebar() {
  return (
    <motion.aside
      className="relative z-20 flex w-12 shrink-0 flex-col items-center gap-3 border-r border-[rgba(255,213,74,0.1)] py-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      {icons.map((icon, i) => (
        <motion.button
          key={i}
          type="button"
          className="flex h-9 w-9 items-center justify-center border border-[rgba(255,213,74,0.15)] text-[#ffd54a] transition-colors hover:border-[rgba(255,213,74,0.45)] hover:bg-[rgba(255,213,74,0.06)]"
          style={{ borderRadius: "4px" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xs opacity-70">{icon}</span>
        </motion.button>
      ))}
    </motion.aside>
  );
}
