import { motion } from "framer-motion";

export function MonitorLoading() {
  return (
    <div className="empire-root flex h-screen flex-col items-center justify-center">
      <motion.div className="empire-spinner" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
      <p className="mt-4 font-['IBM_Plex_Mono'] text-[10px] tracking-[0.2em] text-[#e8c84a]">OLTIN SIGNAL</p>
    </div>
  );
}
