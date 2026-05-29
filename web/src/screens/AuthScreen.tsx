import { useState } from "react";
import { FuturisticBackground } from "../components/ui/FuturisticBackground";
import { api } from "../lib/api";

interface Props {
  onLogin: (username: string, role: "admin" | "user") => void;
}

export function AuthScreen({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api.auth.login(username.trim().toLowerCase(), password);
      if (!r.ok || !r.session) {
        setError(r.error ?? "Kirish muvaffaqiyatsiz");
        return;
      }
      onLogin(r.session.username, r.session.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tizim xatosi");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setUsername("Lynxos");
    setPassword("3888");
  };

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#020408] p-4 sm:p-6">
      <FuturisticBackground variant="login" />

      <div className="relative z-10 w-full max-w-md">
        <div className="fx-border-animated fx-glass rounded-2xl p-6 sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-amber-500/20 to-cyan-500/10 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
              <span className="text-3xl">⚡</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-[0.15em] text-amber-400 fx-glow-text">
              Oltin Signal
            </h1>
            <p className="mt-1 font-display text-xs tracking-[0.25em] text-cyan-400/90">
              XAUUSD · BASHORAT · AI SIGNAL
            </p>
            <p className="mt-3 font-mono-ui text-[10px] uppercase tracking-widest text-slate-500">
              Yangiliklar · indikatorlar · aniq savdo
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-wider text-cyan-500/80">
                Foydalanuvchi
              </label>
              <input
                className="fx-input w-full rounded-xl px-4 py-3.5 font-mono-ui text-sm text-slate-100 placeholder:text-slate-600"
                placeholder="login"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono-ui text-[10px] uppercase tracking-wider text-cyan-500/80">
                Parol
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className="fx-input w-full rounded-xl px-4 py-3.5 pr-12 font-mono-ui text-sm text-slate-100 placeholder:text-slate-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-mono-ui text-[10px] text-cyan-600 hover:text-cyan-400"
                >
                  {showPass ? "YASHIR" : "KO'R"}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-center font-mono-ui text-xs text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="fx-btn-primary mt-2 w-full rounded-xl py-4 text-sm font-bold"
            >
              {loading ? "ULANMOQDA..." : "TERMINALGA KIRISH"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-cyan-900/30 pt-5">
            <button
              type="button"
              onClick={fillDemo}
              className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-1.5 font-mono-ui text-[10px] text-amber-400 transition hover:border-amber-400/50 hover:bg-amber-900/30"
            >
              Tez kirish
            </button>
            <span className="font-mono-ui text-[9px] text-slate-600">
              Admin → alohida kirish
            </span>
          </div>
        </div>

        <p className="mt-4 text-center font-mono-ui text-[9px] text-slate-600">
          Foydalanuvchilar faqat admin panel orqali boshqariladi
        </p>
      </div>
    </div>
  );
}
