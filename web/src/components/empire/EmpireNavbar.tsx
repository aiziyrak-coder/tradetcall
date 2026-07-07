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
      className="empire-navbar"
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="empire-navbar__left">
        <div className="empire-navbar__logo">✦</div>
        <div>
          <p className="empire-navbar__brand">OLTIN SIGNAL</p>
          <p className="empire-navbar__subtitle">XAU/USD · AI TERMINAL</p>
        </div>
        {analyzing ? (
          <span className="empire-navbar__badge">TAHLIL…</span>
        ) : (
          <button type="button" className="empire-btn-gold" disabled={sessionBusy} onClick={onRequestForecast}>
            {UZ.monitorForecast}
          </button>
        )}
      </div>

      <div className="empire-navbar__center">
        <span className={liveOk ? "empire-live-dot--on" : "empire-live-dot--off"}>{liveOk ? "●" : "○"}</span>
        <span className="empire-navbar__time">{lastUpdate.split(" · ")[0]}</span>
        {tickSeq != null && <span>#{tickSeq}</span>}
        <span>{session.nameUz}</span>
        {signal && phase === "ready" && (
          <span className="empire-navbar__badge">
            {signal.action} {prob}%
          </span>
        )}
      </div>

      <div className="empire-navbar__right">
        <span className="empire-navbar__user">{username.toUpperCase()}</span>
        {onOpenSettings && (
          <button type="button" className="empire-navbar__link" onClick={onOpenSettings}>
            {UZ.settings.toUpperCase()}
          </button>
        )}
        {isAdmin && onOpenAdmin && (
          <button type="button" className="empire-navbar__link" onClick={onOpenAdmin}>
            ADMIN
          </button>
        )}
        <span className="empire-navbar__lang">O&apos;ZB</span>
        <button type="button" className="empire-navbar__logout" onClick={onLogout}>
          {UZ.logout.toUpperCase()}
        </button>
      </div>
    </motion.header>
  );
}
