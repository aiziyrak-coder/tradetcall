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
          </div>
        </div>
      </div>
    </div>
  );
}
