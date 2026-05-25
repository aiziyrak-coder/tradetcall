import { useCallback, useEffect, useState } from "react";
import type { UserPublic } from "../../../shared/types";
import { FuturisticBackground } from "../components/ui/FuturisticBackground";
import { api } from "../lib/api";

interface Props {
  username: string;
  onOpenMonitor?: () => void;
  onLogout: () => void;
}

export function AdminScreen({ username, onOpenMonitor, onLogout }: Props) {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [djangoUrl, setDjangoUrl] = useState("http://127.0.0.1:8001/admin/");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, urlRes] = await Promise.all([
        api.admin.listUsers(),
        api.admin.getDjangoUrl(),
      ]);
      if (usersRes.ok && usersRes.users) setUsers(usersRes.users);
      else setMsg(usersRes.error ?? "Yuklash xatosi");
      if (urlRes.url) setDjangoUrl(urlRes.url);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Yuklash xatosi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020408] text-slate-100">
      <FuturisticBackground variant="login" />
      <div className="relative z-10 mx-auto max-w-3xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-bold text-amber-400">Admin panel</h1>
            <p className="text-[12px] text-slate-400">{username} · Django REST + Django Admin</p>
          </div>
          <div className="flex gap-2">
            {onOpenMonitor && (
              <button
                type="button"
                onClick={onOpenMonitor}
                className="rounded border border-cyan-500/40 px-3 py-1.5 text-[11px] text-cyan-300"
              >
                Terminal
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="rounded border border-red-500/40 px-3 py-1.5 text-[11px] text-red-400"
            >
              Chiqish
            </button>
          </div>
        </div>

        <div className="fx-glass mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
          <p className="text-[12px] font-bold text-emerald-400">Foydalanuvchi boshqaruvi</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            Yangi foydalanuvchi qo&apos;shish, parol va rol — faqat{" "}
            <strong>Django Admin</strong> orqali.
          </p>
          <a
            href={djangoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-emerald-500"
          >
            Django Admin ochish →
          </a>
        </div>

        <div className="fx-glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-cyan-400">Foydalanuvchilar</h2>
            <button type="button" onClick={load} className="text-[11px] text-amber-400 hover:underline">
              Yangilash
            </button>
          </div>
          {msg && <p className="mb-2 text-[12px] text-red-400">{msg}</p>}
          {loading ? (
            <p className="text-[12px] text-slate-500">Yuklanmoqda…</p>
          ) : (
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500">
                  <th className="py-2">Login</th>
                  <th className="py-2">Rol</th>
                  <th className="py-2">Holat</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/80">
                    <td className="py-2 font-medium">{u.username}</td>
                    <td className="py-2 text-violet-300">{u.role}</td>
                    <td className="py-2">{u.active ? "Faol" : "O'chirilgan"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 text-[10px] text-slate-500">
            Loginlar: <b className="text-amber-300">Lynxos</b> / 3888 ·{" "}
            <b className="text-amber-300">Ahror</b> / 9930
          </p>
        </div>
      </div>
    </div>
  );
}
