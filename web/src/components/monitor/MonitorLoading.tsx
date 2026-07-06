import { motion } from "framer-motion";

export function MonitorLoading() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-black">
      <motion.div
        className="h-12 w-12 border-2 border-[rgba(255,213,74,0.15)] border-t-[#ffd54a]"
        style={{ borderRadius: "4px" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      />
      <p className="mt-4 font-['Syncopate'] text-[10px] tracking-[0.3em] text-[#ffd54a]">OLTIN SIGNAL</p>
    </div>
  );
}
