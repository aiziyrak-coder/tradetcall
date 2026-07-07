import { motion } from "framer-motion";
import { getMarketSession } from "../../../../shared/market-session";
import type { AiPhase, AiTradeSignal } from "../../../../shared/ai-trade-signal";
import { UZ } from "../../lib/uz";

interface Props {
  username: string;
  lastUpdate: string;
  tickSeq?: number;
  liveOk: boolean;
  signal: AiTradeSignal | null;
  phase: AiPhase;
  analyzing: boolean;
  sessionBusy: boolean;
  onRequestForecast: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

export function EmpireNavbar({
  username,
  lastUpdate,
  tickSeq,
  liveOk,
  signal,
  phase,
  analyzing,
  sessionBusy,
  onRequestForecast,
  onOpenSettings,
  onLogout,
  isAdmin,
  onOpenAdmin,
}: Props) {
  const session = getMarketSession();
  const prob = signal?.winProbability ?? signal?.confidence;

  return (
    <motion.header
      className="relative z-30 flex shrink-0 items-center gap-4 border-b border-[rgba(255,213,74,0.12)] px-4 py-2.5 backdrop-blur-xl"
      style={{ background: "var(--empire-surface)" }}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center border border-[rgba(255,213,74,0.35)]"
          style={{
            clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
            background: "linear-gradient(135deg, rgba(255,213,74,0.2), transparent)",
          }}
        >
          <span className="text-sm text-[#ffd54a]">✦</span>
        </div>
        <div>
          <p className="font-['Syncopate'] text-[11px] font-bold tracking-[0.2em] text-[#ffe88b]">
            OLTIN SIGNAL
          </p>
          <p className="text-[8px] tracking-[0.15em] text-[rgba(255,232,139,0.4)]">
            AI POWERED FOREX & CRYPTO SIGNALS
          </p>
        </div>
        {analyzing ? (
          <span className="text-[10px] tracking-widest text-[#ffd54a]">TAHLIL…</span>
        ) : (
          <button type="button" className="empire-btn-gold" disabled={sessionBusy} onClick={onRequestForecast}>
            ⚡ {UZ.monitorForecast}
          </button>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center gap-3 text-[10px] tracking-wider text-[rgba(255,232,139,0.55)]">
        <span className={liveOk ? "text-[#ffd54a]" : "text-[#ff6b4a]"}>{liveOk ? "●" : "○"}</span>
        <span className="font-['JetBrains_Mono'] text-[#ffe88b]">{lastUpdate.split(" · ")[0]}</span>
        {tickSeq != null && <span>#{tickSeq}</span>}
        <span>{session.nameUz}</span>
        {signal && phase === "ready" && (
          <span
            className="border border-[rgba(255,213,74,0.3)] px-2 py-0.5 font-['Syncopate'] text-[9px] font-bold text-[#ffd54a]"
            style={{ background: "rgba(255,213,74,0.08)" }}
          >
            {signal.action} {prob}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-[9px] tracking-[0.12em]">
        <span className="text-[#ffd54a]">{username.toUpperCase()}</span>
        {onOpenSettings && (
          <button type="button" className="text-[rgba(255,232,139,0.6)] hover:text-[#ffe88b]" onClick={onOpenSettings}>
            {UZ.settings.toUpperCase()}
          </button>
        )}
        {isAdmin && onOpenAdmin && (
          <button type="button" className="text-[rgba(255,232,139,0.5)]" onClick={onOpenAdmin}>
            ADMIN
          </button>
        )}
        <span className="border border-[rgba(255,213,74,0.2)] px-1.5 py-0.5 text-[#ffd54a]">O&apos;ZB</span>
        <button type="button" className="text-[#ff8a70] hover:text-[#ffb8a8]" onClick={onLogout}>
          {UZ.logout.toUpperCase()}
        </button>
      </div>
    </motion.header>
  );
}
