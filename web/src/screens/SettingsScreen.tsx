import { useEffect, useState } from "react";
import { FuturisticBackground } from "../components/ui/FuturisticBackground";
import { api } from "../lib/api";
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
  const [keyStatus, setKeyStatus] = useState<{ hasKey: boolean; preview: string }>({
    hasKey: false,
    preview: "",
  });
  const [keyInput, setKeyInput] = useState("");
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [keyBusy, setKeyBusy] = useState(false);

  useEffect(() => {
    setNotifyPerm(getNotifyPermission());
    void api.settings
      .getApiKey()
      .then(setKeyStatus)
      .catch(() => setKeyMsg("Kalit holatini yuklab bo'lmadi"));
  }, []);

  const update = (patch: Partial<typeof prefs>) => {
    setPrefs(saveTradePrefs(patch));
  };

  const refreshKeyStatus = async () => {
    const st = await api.settings.getApiKey();
    setKeyStatus(st);
    return st;
  };

  const saveApiKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setKeyMsg("Kalitni kiriting (sk-… DeepSeek)");
      return;
    }
    setKeyBusy(true);
    setKeyMsg(null);
    try {
      await api.settings.setApiKey(trimmed);
      setKeyInput("");
      await refreshKeyStatus();
      setKeyMsg("✓ API kalit saqlandi — endi YANGI PROGNOZ bosing");
    } catch (e) {
      setKeyMsg(e instanceof Error ? e.message : "Saqlash xatosi");
    } finally {
      setKeyBusy(false);
    }
  };

  const testApiKey = async () => {
    setKeyBusy(true);
    setKeyMsg(null);
    try {
      const r = await api.settings.testApiKey(keyInput.trim());
      setKeyMsg(`✓ Kalit ishlaydi${r.model ? ` (${r.model})` : ""}${r.hint ? ` — ${r.hint}` : ""}`);
    } catch (e) {
      setKeyMsg(e instanceof Error ? e.message : "Test xatosi");
    } finally {
      setKeyBusy(false);
    }
  };

  const clearApiKey = async () => {
    if (!confirm("API kalitni o'chirishni tasdiqlaysizmi?")) return;
    setKeyBusy(true);
    setKeyMsg(null);
    try {
      await api.settings.clearApiKey();
      setKeyInput("");
      await refreshKeyStatus();
      setKeyMsg("Kalit o'chirildi");
    } catch (e) {
      setKeyMsg(e instanceof Error ? e.message : "Xato");
    } finally {
      setKeyBusy(false);
    }
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
            <div className="rounded-lg border-2 border-amber-500/50 bg-amber-950/25 p-4 shadow-[0_0_24px_rgba(251,191,36,0.08)]">
              <p className="font-bold text-amber-300">{UZ.apiKey.title}</p>
              <p className="mt-1 text-[12px] text-slate-400">{UZ.apiKey.hint}</p>
              <p className="mt-2 text-[11px]">
                {keyStatus.hasKey ? (
                  <span className="font-bold text-emerald-400">
                    ✓ {UZ.apiKey.saved}
                    {keyStatus.preview ? ` (${UZ.apiKey.preview}: ${keyStatus.preview})` : ""}
                  </span>
                ) : (
                  <span className="font-bold text-red-400">✗ {UZ.apiKey.notSaved}</span>
                )}
              </p>
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder={UZ.apiKey.placeholder}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="fx-input mt-3 w-full rounded-lg px-3 py-3 font-mono-ui text-sm text-slate-100"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={keyBusy}
                  onClick={() => void saveApiKey()}
                  className="touch-target flex-1 rounded-lg bg-amber-600 px-4 py-3 text-[13px] font-bold text-black disabled:opacity-50"
                >
                  {keyBusy ? "…" : UZ.apiKey.save}
                </button>
                <button
                  type="button"
                  disabled={keyBusy || (!keyInput.trim() && !keyStatus.hasKey)}
                  onClick={() => void testApiKey()}
                  className="touch-target flex-1 rounded-lg border border-cyan-600/50 bg-cyan-950/50 px-4 py-3 text-[13px] font-bold text-cyan-200 disabled:opacity-50"
                >
                  {UZ.apiKey.test}
                </button>
                {keyStatus.hasKey && (
                  <button
                    type="button"
                    disabled={keyBusy}
                    onClick={() => void clearApiKey()}
                    className="touch-target rounded-lg border border-red-800/60 px-4 py-3 text-[12px] text-red-300 disabled:opacity-50"
                  >
                    {UZ.apiKey.clear}
                  </button>
                )}
              </div>
              {keyMsg && (
                <p
                  className={`mt-2 text-[12px] ${keyMsg.startsWith("✓") ? "text-emerald-400" : "text-amber-300"}`}
                >
                  {keyMsg}
                </p>
              )}
            </div>

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

            <div className="rounded-lg border border-red-600/40 bg-red-950/20 p-3">
              <p className="font-bold text-red-300">Kapital himoyasi</p>
              <p className="mt-1 text-[12px] text-slate-400">
                Professional rejim — kunlik limit va ketma-ket zararlardan himoya.
              </p>
              <label className="mt-2 flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={prefs.capitalShield.enabled}
                  onChange={(e) =>
                    update({
                      capitalShield: { ...prefs.capitalShield, enabled: e.target.checked },
                    })
                  }
                  className="h-4 w-4"
                />
                Kapital himoyasini yoqish
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[11px]">
                  <span className="text-slate-500">Kunlik max foyda % (greed stop)</span>
                  <input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={prefs.capitalShield.maxDailyProfitPct}
                    onChange={(e) =>
                      update({
                        capitalShield: {
                          ...prefs.capitalShield,
                          maxDailyProfitPct: Number(e.target.value) || 1.5,
                        },
                      })
                    }
                    className="fx-input rounded-lg px-2 py-2 font-mono-ui"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px]">
                  <span className="text-slate-500">Kunlik max zarar %</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={prefs.capitalShield.maxDailyLossPct}
                    onChange={(e) =>
                      update({
                        capitalShield: {
                          ...prefs.capitalShield,
                          maxDailyLossPct: Number(e.target.value) || 3,
                        },
                      })
                    }
                    className="fx-input rounded-lg px-2 py-2 font-mono-ui"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px]">
                  <span className="text-slate-500">Kunlik max signal</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={prefs.capitalShield.maxTradesPerDay}
                    onChange={(e) =>
                      update({
                        capitalShield: {
                          ...prefs.capitalShield,
                          maxTradesPerDay: Number(e.target.value) || 6,
                        },
                      })
                    }
                    className="fx-input rounded-lg px-2 py-2 font-mono-ui"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px]">
                  <span className="text-slate-500">Ketma-ket zarar → tanaffus</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={prefs.capitalShield.pauseAfterLosses}
                    onChange={(e) =>
                      update({
                        capitalShield: {
                          ...prefs.capitalShield,
                          pauseAfterLosses: Number(e.target.value) || 2,
                        },
                      })
                    }
                    className="fx-input rounded-lg px-2 py-2 font-mono-ui"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px]">
                  <span className="text-slate-500">Tanaffus (daqiqa)</span>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    value={prefs.capitalShield.pauseCooldownMinutes}
                    onChange={(e) =>
                      update({
                        capitalShield: {
                          ...prefs.capitalShield,
                          pauseCooldownMinutes: Number(e.target.value) || 60,
                        },
                      })
                    }
                    className="fx-input rounded-lg px-2 py-2 font-mono-ui"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px]">
                  <span className="text-slate-500">Min bozor sifati</span>
                  <input
                    type="number"
                    min={40}
                    max={90}
                    value={prefs.capitalShield.minMarketQuality}
                    onChange={(e) =>
                      update({
                        capitalShield: {
                          ...prefs.capitalShield,
                          minMarketQuality: Number(e.target.value) || 55,
                        },
                      })
                    }
                    className="fx-input rounded-lg px-2 py-2 font-mono-ui"
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

          </div>
        </div>
      </div>
    </div>
  );
}
