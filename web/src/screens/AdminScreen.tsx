import { useCallback, useEffect, useState } from "react";
import type { UserPublic, UserRole } from "../../../shared/types";
import { FuturisticBackground } from "../components/ui/FuturisticBackground";
import { api } from "../lib/api";

interface Props {
  username: string;
  onOpenMonitor?: () => void;
  onLogout: () => void;
}

type ModalMode = "create" | "edit" | null;

export function AdminScreen({ username, onOpenMonitor, onLogout }: Props) {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<UserPublic | null>(null);
  const [formUser, setFormUser] = useState("");
  const [formPass, setFormPass] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("user");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.admin.listUsers();
      if (r.ok && r.users) setUsers(r.users);
      else setMsg(r.error ?? "Yuklash xatosi");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Yuklash xatosi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setSelected(null);
    setFormUser("");
    setFormPass("");
    setFormRole("user");
    setModal("create");
    setMsg("");
  };

  const openEdit = (u: UserPublic) => {
    setSelected(u);
    setFormUser(u.username);
    setFormPass("");
    setFormRole(u.role);
    setModal("edit");
    setMsg("");
  };

  const closeModal = () => {
    setModal(null);
    setSelected(null);
  };

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      if (modal === "create") {
        const u = formUser.trim().toLowerCase();
        if (u.length < 3) {
          setMsg("Login kamida 3 belgi");
          return;
        }
        if (!formPass.trim()) {
          setMsg("Parol kiriting");
          return;
        }
        const r = await api.admin.createUser(u, formPass, formRole);
        if (!r.ok) {
          setMsg(r.error ?? "Xato");
          return;
        }
        setMsg("✓ Foydalanuvchi yaratildi");
      } else if (modal === "edit" && selected) {
        const patch: { password?: string; role?: UserRole; active?: boolean } = {
          role: formRole,
        };
        if (formPass.trim()) patch.password = formPass;
        const r = await api.admin.updateUser(selected.id, patch);
        if (!r.ok) {
          setMsg(r.error ?? "Xato");
          return;
        }
        setMsg("✓ Yangilandi");
      }
      closeModal();
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Tarmoq xatosi");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: UserPublic) => {
    try {
      const r = await api.admin.updateUser(u.id, {
        active: !u.active,
      });
      if (!r.ok) setMsg(r.error ?? "Xato");
      else await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xato");
    }
  };

  const remove = async (u: UserPublic) => {
    if (!confirm(`"${u.username}" ni o'chirishni tasdiqlaysizmi?`)) return;
    try {
      const r = await api.admin.deleteUser(u.id);
      if (!r.ok) setMsg(r.error ?? "Xato");
      else {
        setMsg("✓ O'chirildi");
        await load();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xato");
    }
  };

  const traders = users.filter((u) => u.role === "user");
  const admins = users.filter((u) => u.role === "admin");

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#020408]">
      <FuturisticBackground variant="admin" />

      <aside className="relative z-10 flex w-56 shrink-0 flex-col border-r border-violet-500/20 bg-[#040a14]/90 backdrop-blur-xl">
        <div className="border-b border-violet-500/20 p-5">
          <p className="font-display text-[10px] tracking-[0.25em] text-violet-400">
            ADMIN
          </p>
          <h1 className="font-display text-lg font-bold text-cyan-300">PANEL</h1>
          <p className="mt-1 font-mono-ui text-[9px] text-slate-500">{username}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 font-mono-ui text-xs text-cyan-300">
            👥 Foydalanuvchilar
          </div>
          <div className="rounded-lg px-3 py-2 font-mono-ui text-[10px] text-slate-600">
            Jami: {users.length}
          </div>
          <div className="rounded-lg px-3 py-2 font-mono-ui text-[10px] text-amber-600/80">
            Treyder: {traders.length}
          </div>
          <div className="rounded-lg px-3 py-2 font-mono-ui text-[10px] text-violet-400/80">
            Admin: {admins.length}
          </div>
        </nav>
        {onOpenMonitor && (
          <button
            type="button"
            onClick={onOpenMonitor}
            className="mx-3 rounded-lg border border-cyan-500/30 py-2.5 font-mono-ui text-xs text-cyan-400 transition hover:bg-cyan-950/40"
          >
            Terminal
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="m-3 rounded-lg border border-red-500/30 py-2.5 font-mono-ui text-xs text-red-400 transition hover:bg-red-950/40"
        >
          Chiqish
        </button>
      </aside>

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-violet-500/15 bg-[#060c18]/80 px-6 py-4 backdrop-blur-md">
          <div className="flex-1">
            <h2 className="font-display text-xl tracking-wide text-slate-100">
              Foydalanuvchilar boshqaruvi
            </h2>
            <p className="font-mono-ui text-[10px] text-slate-500">
              Login va parollar shu yerda — platformaga faqat shu ro&apos;yxatdan kiriladi
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/80 to-violet-950/80 px-5 py-2.5 font-display text-xs tracking-wider text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.15)] transition hover:border-cyan-400/60"
          >
            + YANGI USER
          </button>
        </header>

        {msg && (
          <div className="mx-6 mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-2 font-mono-ui text-xs text-emerald-300">
            {msg}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-6">
          <div className="fx-glass-admin fx-glass overflow-hidden rounded-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-cyan-900/40 bg-[#0a1420]/80 font-mono-ui text-[10px] uppercase tracking-wider text-cyan-500/90">
                  <th className="px-5 py-4">Login</th>
                  <th className="px-5 py-4">Rol</th>
                  <th className="px-5 py-4">Holat</th>
                  <th className="px-5 py-4">Yaratilgan</th>
                  <th className="px-5 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center font-mono-ui text-sm text-slate-500">
                      Yuklanmoqda...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                      Foydalanuvchi yo&apos;q
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-800/50 transition hover:bg-cyan-950/20"
                    >
                      <td className="px-5 py-4">
                        <span className="font-display text-sm text-amber-300">
                          {u.username}
                        </span>
                        {u.username === "lynxos" && (
                          <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono-ui text-[8px] text-amber-400">
                            DEMO
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-mono-ui text-[10px] ${
                            u.role === "admin"
                              ? "bg-violet-500/20 text-violet-300"
                              : "bg-cyan-500/15 text-cyan-300"
                          }`}
                        >
                          {u.role === "admin" ? "ADMIN" : "TREYDER"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toggleActive(u)}
                          className={`rounded-full px-2.5 py-0.5 font-mono-ui text-[10px] ${
                            u.active
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {u.active ? "FAOL" : "O'CHIQ"}
                        </button>
                      </td>
                      <td className="px-5 py-4 font-mono-ui text-[10px] text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString("uz-UZ")}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="mr-2 rounded-lg border border-cyan-600/30 px-3 py-1 font-mono-ui text-[10px] text-cyan-400 hover:bg-cyan-950/40"
                        >
                          Tahrirlash
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(u)}
                          className="rounded-lg border border-red-600/30 px-3 py-1 font-mono-ui text-[10px] text-red-400 hover:bg-red-950/40"
                        >
                          O&apos;chirish
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="fx-panel rounded-xl p-4">
              <p className="font-mono-ui text-[10px] text-slate-500">DEMO TREYDER</p>
              <p className="mt-1 font-display text-lg text-amber-400">Lynxos</p>
              <p className="font-mono-ui text-xs text-slate-400">Parol: 3888</p>
            </div>
            <div className="fx-panel rounded-xl p-4">
              <p className="font-mono-ui text-[10px] text-slate-500">ADMIN KIRISH</p>
              <p className="mt-1 font-display text-lg text-violet-400">admin</p>
              <p className="font-mono-ui text-xs text-slate-400">Parol: admin</p>
            </div>
            <div className="fx-panel rounded-xl p-4">
              <p className="font-mono-ui text-[10px] text-slate-500">ESLATMA</p>
              <p className="mt-2 font-mono-ui text-[10px] leading-relaxed text-slate-500">
                Ro&apos;yxatdan o&apos;tish olib tashlandi. Yangi user faqat shu paneldan qo&apos;shiladi.
              </p>
            </div>
          </div>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="fx-glass fx-border-animated w-full max-w-md rounded-2xl p-6">
            <h3 className="font-display text-lg text-cyan-300">
              {modal === "create" ? "Yangi foydalanuvchi" : "Tahrirlash"}
            </h3>
            <div className="mt-4 space-y-3">
              {modal === "create" && (
                <div>
                  <label className="font-mono-ui text-[10px] text-cyan-600">Login</label>
                  <input
                    className="fx-input mt-1 w-full rounded-lg px-3 py-2.5 font-mono-ui text-sm"
                    value={formUser}
                    onChange={(e) => setFormUser(e.target.value)}
                    placeholder="username"
                  />
                </div>
              )}
              <div>
                <label className="font-mono-ui text-[10px] text-cyan-600">
                  {modal === "create" ? "Parol" : "Yangi parol (bo'sh = o'zgarmaydi)"}
                </label>
                <input
                  type="password"
                  className="fx-input mt-1 w-full rounded-lg px-3 py-2.5 font-mono-ui text-sm"
                  value={formPass}
                  onChange={(e) => setFormPass(e.target.value)}
                  placeholder="••••••"
                />
              </div>
              <div>
                <label className="font-mono-ui text-[10px] text-cyan-600">Rol</label>
                <select
                  className="fx-input mt-1 w-full rounded-lg px-3 py-2.5 font-mono-ui text-sm"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                >
                  <option value="user">Treyder (platforma)</option>
                  <option value="admin">Admin (panel)</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-lg border border-slate-600 py-2.5 font-mono-ui text-xs text-slate-400"
              >
                Bekor
              </button>
              <button
                type="button"
                disabled={saving || (modal === "create" && (!formUser.trim() || !formPass))}
                onClick={save}
                className="fx-btn-primary flex-1 rounded-lg py-2.5 text-xs"
              >
                {saving ? "..." : "SAQLASH"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
