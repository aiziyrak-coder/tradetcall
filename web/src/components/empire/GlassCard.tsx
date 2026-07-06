import { motion } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  float?: boolean;
  style?: CSSProperties;
}

export function GlassCard({ children, className = "", float = false, style }: Props) {
  return (
    <motion.div
      className={`empire-glass ${className}`}
      style={style}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: float ? -4 : -2, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.div>
  );
}
