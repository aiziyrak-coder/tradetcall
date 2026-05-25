import { FuturisticBackground } from "../components/ui/FuturisticBackground";
import { UZ } from "../lib/uz";

interface Props {
  username: string;
  onBack: () => void;
}

export function SettingsScreen({ username, onBack }: Props) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#020408]">
      <FuturisticBackground variant="login" />
      <div className="relative z-10 mx-auto w-full max-w-lg flex-1 p-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-[12px] text-cyan-400 hover:underline"
        >
          ← Terminalga qaytish
        </button>

        <div className="fx-glass rounded-2xl p-6">
          <h1 className="font-display text-xl font-bold text-amber-400">{UZ.settings}</h1>
          <p className="mt-1 text-[12px] text-slate-400">{username} · signal tizimi</p>

          <div className="mt-6 space-y-4 text-[12px] leading-relaxed text-slate-300">
            <div className="rounded-lg border border-emerald-600/40 bg-emerald-950/20 p-3">
              <p className="font-bold text-emerald-300">Ishonchli signal qoidalari</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-[11px]">
                <li>BUY/SELL faqat 7/7 filter MOS bo&apos;lganda</li>
                <li>Yangiliklar + shamlar bir yo&apos;nalishda</li>
                <li>R:R uzoq 1:2.4 · yaqin 1:2.2</li>
                <li>Konfluens 82%+ / 88%+</li>
                <li>NFP/CPI/FOMC atrofida avtomatik HOLD</li>
                <li>Shubha bo&apos;lsa HOLD — zarar kamaytirish birinchi</li>
              </ul>
            </div>

            <div className="rounded-lg border border-cyan-600/30 bg-cyan-950/20 p-3">
              <p className="font-bold text-cyan-300">MT5 broker narx</p>
              <p className="mt-1 text-[11px]">
                <code className="text-amber-200">mt5-bridge/TradeBridgeEA.mq5</code> — server{" "}
                <code className="text-amber-200">MT5_BRIDGE_SECRET</code>
              </p>
            </div>

            <p className="text-[10px] text-slate-500">
              Manbalar: Yahoo + spot narx, RSS yangiliklar, makro drayverlar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
