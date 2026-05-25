import { useEffect, useState } from "react";
import { FuturisticBackground } from "../components/ui/FuturisticBackground";
import {
  getNotifyPermission,
  requestNotificationPermission,
} from "../lib/notifications";
import { loadTradePrefs, saveTradePrefs } from "../lib/trade-prefs";
import { UZ } from "../lib/uz";

interface Props {
  username: string;
  onBack: () => void;
}

export function SettingsScreen({ username, onBack }: Props) {
  const [prefs, setPrefs] = useState(loadTradePrefs);
  const [notifyPerm, setNotifyPerm] = useState(getNotifyPermission());
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  useEffect(() => {
    setNotifyPerm(getNotifyPermission());
  }, []);

  const update = (patch: Partial<typeof prefs>) => {
    setPrefs(saveTradePrefs(patch));
  };

  const enableNotify = async () => {
    const p = await requestNotificationPermission();
    setNotifyPerm(p);
    if (p === "granted") {
      update({ notifyEnabled: true });
      setNotifyMsg("✓ Ogohlantirish yoqildi — boshqa oynada ham signal keladi");
    } else if (p === "denied") {
      setNotifyMsg("Brauzer sozlamalaridan bildirishnomalarni yoqing");
    } else {
      setNotifyMsg("Ruxsat berilmadi");
    }
  };

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col overflow-y-auto bg-[#020408]">
      <FuturisticBackground variant="login" />
      <div className="relative z-10 mx-auto w-full max-w-lg flex-1 p-4 pb-8 sm:p-6">
        <button
          type="button"
          onClick={onBack}
          className="touch-target mb-4 text-[14px] text-cyan-400 hover:underline"
        >
          ← Terminalga qaytish
        </button>

        <div className="fx-glass rounded-2xl p-4 sm:p-6">
          <h1 className="font-display text-xl font-bold text-amber-400">{UZ.settings}</h1>
          <p className="mt-1 text-[13px] text-slate-400">{username}</p>

          <div className="mt-6 space-y-4 text-[13px] leading-relaxed text-slate-300">
            <div className="rounded-lg border border-violet-600/40 bg-violet-950/20 p-3">
              <p className="font-bold text-violet-300">Signal ogohlantirish</p>
              <p className="mt-1 text-[12px] text-slate-400">
                BUY/SELL chiqganda brauzer bildirishnomasi — telefon va kompyuterda, boshqa
                oynada bo&apos;lsangiz ham. Brauzer ochiq turishi kerak.
              </p>
              <p className="mt-2 text-[11px]">
                Holat:{" "}
                <span className="font-bold text-cyan-300">
                  {notifyPerm === "granted"
                    ? "YOQILGAN"
                    : notifyPerm === "denied"
                      ? "RAD ETILGAN"
                      : notifyPerm === "unsupported"
                        ? "QOLLANMAYDI"
                        : "KUTILMOQDA"}
                </span>
              </p>
              <button
                type="button"
                onClick={() => void enableNotify()}
                className="touch-target mt-2 w-full rounded-lg bg-violet-600/80 px-4 py-3 text-[13px] font-bold text-white"
              >
                Ogohlantirishni yoqish
              </button>
              <label className="mt-2 flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={prefs.notifyEnabled}
                  onChange={(e) => update({ notifyEnabled: e.target.checked })}
                  className="h-4 w-4"
                />
                Signal kelganda xabar berish
              </label>
              {notifyMsg && <p className="mt-2 text-[12px] text-emerald-400">{notifyMsg}</p>}
            </div>

            <div className="rounded-lg border border-cyan-600/40 bg-cyan-950/20 p-3">
              <p className="font-bold text-cyan-300">Lot hisobi</p>
              <p className="mt-1 text-[12px] text-slate-400">
                Depozit va risk % — signal panelida lot avtomatik chiqadi.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[11px] text-slate-500">Depozit USD</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={100}
                    step={100}
                    value={prefs.accountUsd}
                    onChange={(e) => update({ accountUsd: Number(e.target.value) || 1000 })}
                    className="fx-input rounded-lg px-3 py-3 font-mono-ui text-base"
                  />
                </label>
                <label className="flex w-full flex-col gap-1 sm:w-28">
                  <span className="text-[11px] text-slate-500">Risk %</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0.25}
                    max={5}
                    step={0.25}
                    value={prefs.riskPercent}
                    onChange={(e) => update({ riskPercent: Number(e.target.value) || 1 })}
                    className="fx-input rounded-lg px-3 py-3 font-mono-ui text-base"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-600/40 bg-emerald-950/20 p-3">
              <p className="font-bold text-emerald-300">Lot va vaqt qoidalari</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-[12px]">
                <li>
                  <b>Yaqin:</b> maksimum <b>30 daqiqa</b> bozorda. TP yoki vaqt — chiqish.
                </li>
                <li>
                  <b>Uzoq:</b> <b>1–4 hafta</b> swing. Kunlik SL buzilsa — chiqish.
                </li>
                <li>
                  Lot = depozit × risk% ÷ SL masofa. 7/7 filter MOS bo&apos;lganda to&apos;liq lot.
                </li>
                <li>1 lot = 100 unsiya. Minimal odatda 0.01 lot.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-cyan-600/30 bg-cyan-950/20 p-3">
              <p className="font-bold text-cyan-300">MT5 broker narx</p>
              <p className="mt-1 text-[11px]">
                <code className="text-amber-200">mt5-bridge/TradeBridgeEA.mq5</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
