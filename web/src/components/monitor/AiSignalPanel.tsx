import type { AiPhase, AiTradeSignal } from "../../../../shared/ai-trade-signal";

import type { MonitorSessionInfo } from "../../../../shared/types";

import { CinematicSignal } from "./CinematicSignal";

import { PriceLadder } from "./PriceLadder";



interface Props {

  phase?: AiPhase;

  signal?: AiTradeSignal | null;

  session?: MonitorSessionInfo | null;

  currentPrice?: number;

  onOpenSettings?: () => void;

}



export function AiSignalPanel({

  phase = "idle",

  signal,

  session,

  currentPrice = 0,

  onOpenSettings,

}: Props) {

  const message = session?.messageUz ?? "YANGI PROGNOZ bosing";



  if (phase === "analyzing") {

    return (

      <div className="cine-panel h-full flex flex-col items-center justify-center gap-4 p-4">

        <div className="cine-analyze-orb" />

        <p className="font-cine text-sm tracking-widest text-cyan-300">TAHLIL...</p>

        <p className="text-[10px] text-slate-400">{message}</p>

      </div>

    );

  }



  if (phase === "error") {

    const needsKey = /API kalit|kalit yo'q/i.test(message);

    return (

      <div className="cine-panel h-full p-4">

        <p className="text-red-400 text-[11px]">{message}</p>

        {needsKey && onOpenSettings && (

          <button type="button" onClick={onOpenSettings} className="cine-btn mt-3 w-full">

            API KALIT

          </button>

        )}

      </div>

    );

  }



  if (phase !== "ready" || !signal) {

    return (

      <div className="cine-panel h-full flex flex-col items-center justify-center gap-3 p-4 text-center">

        <div className="cine-standby font-cine text-lg tracking-[0.3em] text-amber-400/70">STANDBY</div>

        <p className="text-[10px] text-slate-400">{message}</p>

        <button type="button" onClick={onOpenSettings} className="cine-btn-outline text-[9px]">

          Sozlamalar

        </button>

      </div>

    );

  }



  const action = signal.action;

  const isHold = action === "HOLD";

  const longMatch = signal.summaryUz.match(/L(\d+)/);
  const shortMatch = signal.summaryUz.match(/S(\d+)/);



  return (

    <div className="cine-panel h-full flex min-h-0 flex-col overflow-hidden">

      <CinematicSignal

        action={action}

        winProbability={signal.winProbability}

        grade={signal.signalGrade}

        longScore={longMatch ? Number(longMatch[1]) : undefined}

        shortScore={shortMatch ? Number(shortMatch[1]) : undefined}

      />



      <div className="term-scroll flex-1 space-y-2 p-3">

        <p className="cine-summary">{signal.summaryUz}</p>



        {!isHold && currentPrice > 0 && (

          <PriceLadder

            current={currentPrice}

            entry={signal.entry}

            stopLoss={signal.stopLoss}

            takeProfit={signal.takeProfit}

            action={action}

          />

        )}



        {!isHold && (

          <div className="cine-levels font-mono-ui">

            <div className="cine-level cine-level--sl">

              <span>STOP</span>

              <strong>${signal.stopLoss.toFixed(2)}</strong>

            </div>

            <div className="cine-level cine-level--entry">

              <span>KIRISH</span>

              <strong>${signal.entry.toFixed(2)}</strong>

            </div>

            <div className="cine-level cine-level--tp">

              <span>MAQSAD</span>

              <strong>${signal.takeProfit.toFixed(2)}</strong>

            </div>

          </div>

        )}



        <div className="cine-block">

          <p className="cine-block__title">{isHold ? "Keyingi harakat" : "Kirish sharti"}</p>

          <p className="cine-block__text">{signal.triggerUz}</p>

        </div>



        <div className="cine-block cine-block--warn">

          <p className="cine-block__title">Bekor qilish</p>

          <p className="cine-block__text">{signal.invalidationUz}</p>

        </div>

      </div>

    </div>

  );

}


