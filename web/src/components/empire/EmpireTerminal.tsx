import { motion } from "framer-motion";
import type { AiPhase } from "../../../../shared/ai-trade-signal";
import type { MonitorSessionInfo, MonitorSnapshot } from "../../../../shared/types";
import { EmpireBackground } from "./EmpireBackground";
import { EmpireNavbar } from "./EmpireNavbar";
import { EmpireSidebar } from "./EmpireSidebar";
import { SignalPanel } from "./SignalPanel";
import { HolographicGlobe } from "./HolographicGlobe";
import { PriceHero } from "./PriceHero";
import { AnalysisPanel } from "./AnalysisPanel";
import { NewsPanels } from "./NewsPanels";
import { EmpireFooter } from "./EmpireFooter";

interface Props {
  username: string;
  data: MonitorSnapshot | null;
  aiPhase: AiPhase;
  session: MonitorSessionInfo | null;
  sessionBusy: boolean;
  lastUpdate: string;
  liveOk: boolean;
  tickFlash: number;
  translating: boolean;
  onRequestForecast: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

export function EmpireTerminal({
  username,
  data,
  aiPhase,
  session,
  sessionBusy,
  lastUpdate,
  liveOk,
  tickFlash,
  translating,
  onRequestForecast,
  onOpenSettings,
  onLogout,
  isAdmin,
  onOpenAdmin,
}: Props) {
  const signal = data?.aiSignal ?? null;
  const gold = data?.gold ?? null;
  const news = data?.news ?? { direct: [], macro: [], geopolitics: [] };
  const phase = aiPhase ?? session?.phase ?? "idle";
  const analyzing = phase === "analyzing";
  const price = gold?.price ?? 0;

  const tickerText =
    news.direct[0]?.titleUz ||
    news.direct[0]?.title ||
    news.macro[0]?.titleUz ||
    "Bozor kuzatilmoqda — OLTIN SIGNAL";

  return (
    <div className="empire-root flex min-h-0 flex-col">
      <EmpireBackground />

      <EmpireNavbar
        username={username}
        lastUpdate={lastUpdate}
        tickSeq={data?.tickSeq}
        liveOk={liveOk}
        signal={signal}
        phase={phase}
        analyzing={analyzing}
        sessionBusy={sessionBusy}
        onRequestForecast={onRequestForecast}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
        isAdmin={isAdmin}
        onOpenAdmin={onOpenAdmin}
      />

      <div className="relative z-10 flex min-h-0 flex-1">
        <EmpireSidebar />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(200px,240px)_1fr_minmax(200px,240px)] gap-2 p-2">
            <motion.div
              className="min-h-0"
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <SignalPanel
                signal={signal}
                phase={phase}
                analyzing={analyzing}
                sessionBusy={sessionBusy}
                price={price}
                onRequestForecast={onRequestForecast}
              />
            </motion.div>

            <motion.div
              className="relative min-h-0"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <HolographicGlobe />
              <PriceHero gold={gold} tickFlash={tickFlash} signal={signal} />
            </motion.div>

            <motion.div
              className="min-h-0"
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <AnalysisPanel data={data} signal={signal} />
            </motion.div>
          </div>

          <NewsPanels news={news} />
        </div>
      </div>

      <EmpireFooter gold={gold} lastUpdate={lastUpdate} liveOk={liveOk} tickerText={tickerText} />

      {translating && (
        <div className="absolute bottom-12 right-4 z-40 text-[9px] tracking-widest text-[#ffd54a]">
          TARJIMA…
        </div>
      )}
    </div>
  );
}
