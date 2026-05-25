import { useEffect, useState } from "react";
import { FuturisticBackground } from "../components/ui/FuturisticBackground";
import { api } from "../lib/api";
import { UZ } from "../lib/uz";

interface Props {
  username: string;
  onBack: () => void;
}

export function SettingsScreen({ username, onBack }: Props) {
  const [preview, setPreview] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void api.settings.getApiKey().then((r) => {
      setHasKey(r.hasKey);
      setPreview(r.preview);
    });
  }, []);

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
          <p className="mt-1 text-[12px] text-slate-400">
            {username} · API kalit serverda saqlanadi (xavfsiz)
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-slate-600/40 bg-black/30 p-3">
              <p className="text-[11px] text-slate-400">Hozirgi holat</p>
              <p className="mt-1 font-mono-ui text-[13px]">
                {hasKey ? (
                  <span className="text-emerald-400">✓ Kalit bor ({preview})</span>
                ) : (
                  <span className="text-amber-400">Kalit kiritilmagan</span>
                )}
              </p>
            </div>

            <label className="block">
              <span className="text-[11px] font-medium text-slate-400">Anthropic API kalit</span>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-ant-..."
                className="fx-input mt-1 w-full rounded-lg px-3 py-2.5 font-mono-ui text-sm"
                autoComplete="off"
              />
            </label>

            {msg && (
              <p
                className={`text-[12px] ${msg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}
              >
                {msg}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading || !keyInput.trim()}
                className="fx-btn-primary rounded-lg px-4 py-2 disabled:opacity-50"
                onClick={async () => {
                  setLoading(true);
                  setMsg(null);
                  try {
                    const t = await api.settings.testApiKey(keyInput.trim());
                    setMsg(`✓ Test OK — ${t.model ?? "Claude"}`);
                  } catch (e) {
                    setMsg(e instanceof Error ? e.message : "Test xatosi");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Test
              </button>
              <button
                type="button"
                disabled={loading || !keyInput.trim()}
                className="rounded-lg border border-amber-500/50 bg-amber-600/20 px-4 py-2 text-[12px] font-semibold text-amber-200 disabled:opacity-50"
                onClick={async () => {
                  setLoading(true);
                  setMsg(null);
                  try {
                    await api.settings.setApiKey(keyInput.trim());
                    const r = await api.settings.getApiKey();
                    setHasKey(r.hasKey);
                    setPreview(r.preview);
                    setKeyInput("");
                    setMsg("✓ Kalit saqlandi");
                  } catch (e) {
                    setMsg(e instanceof Error ? e.message : "Saqlash xatosi");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Saqlash
              </button>
              <button
                type="button"
                disabled={loading}
                className="rounded-lg border border-red-500/40 px-4 py-2 text-[12px] text-red-400 disabled:opacity-50"
                onClick={async () => {
                  setLoading(true);
                  setMsg(null);
                  try {
                    await api.settings.clearApiKey();
                    setHasKey(false);
                    setPreview("");
                    setMsg("✓ Kalit o'chirildi");
                  } catch (e) {
                    setMsg(e instanceof Error ? e.message : "Xato");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                O'chirish
              </button>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-500">
              AI: uzoq muddat strategiya, yangiliklar tarjimasi va chuqur muhokama. Kalit faqat
              serverda — brauzerda ko'rinmaydi. Productionda <code className="text-cyan-600">ANTHROPIC_API_KEY</code>{" "}
              env orqali ham berish mumkin.
            </p>

            <div className="rounded-lg border border-cyan-600/30 bg-cyan-950/20 p-3 text-[10px] leading-relaxed text-slate-300">
              <p className="font-bold text-cyan-300">MT5 haqiqiy narx (broker)</p>
              <p className="mt-1">
                Windows + MT5: <code className="text-amber-200">mt5-bridge/TradeBridgeEA.mq5</code> yoki{" "}
                <code className="text-amber-200">python_bridge.py</code>. Server{" "}
                <code className="text-amber-200">/opt/trade/.env</code> ga{" "}
                <code className="text-amber-200">MT5_BRIDGE_SECRET</code> (min 16 belgi) qo&apos;ying, EA inputida
                xuddi shu secret. Terminalda <b className="text-emerald-400">MT5 LIVE</b> ko&apos;rinishi kerak.
              </p>
              <p className="mt-2 font-bold text-amber-300">Iqtisodiy taqvim</p>
              <p className="mt-1">
                <code className="text-amber-200">TRADING_ECONOMICS_API_KEY</code> yoki bepul{" "}
                <code className="text-amber-200">FINNHUB_API_KEY</code> — .env ga qo&apos;shib trade-api ni restart
                qiling. Kalitsiz taxminiy NFP/CPI/FOMC ishlatiladi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
