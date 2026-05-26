import { useCallback, useEffect, useState } from "react";
import type { UserPublic } from "../../../shared/types";
import { FuturisticBackground } from "../components/ui/FuturisticBackground";
import { api } from "../lib/api";

interface Props {
  username: string;
  onOpenMonitor?: () => void;
  onLogout: () => void;
}

type ModalMode = "create" | "edit" | "password" | null;

export function AdminScreen({ username, onOpenMonitor, onLogout }: Props) {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [djangoUrl, setDjangoUrl] = useState("http://127.0.0.1:8001/admin/");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<UserPublic | null>(null);
  const [saving, setSaving] = useState(false);

  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPassword2, setFormPassword2] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "user">("user");
  const [formActive, setFormActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
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

  const openCreate = () => {
    setSelected(null);
    setFormUsername("");
    setFormPassword("");
    setFormPassword2("");
    setFormRole("user");
    setFormActive(true);
    setModal("create");
    setMsg("");
    setOkMsg("");
  };

  const openEdit = (u: UserPublic) => {
    setSelected(u);
    setFormUsername(u.username);
    setFormPassword("");
    setFormPassword2("");
    setFormRole(u.role);
    setFormActive(u.active);
    setModal("edit");
    setMsg("");
    setOkMsg("");
  };

  const openPassword = (u: UserPublic) => {
    setSelected(u);
    setFormPassword("");
    setFormPassword2("");
    setModal("password");
    setMsg("");
    setOkMsg("");
  };

  const closeModal = () => {
    setModal(null);
    setSelected(null);
  };

  const handleCreate = async () => {
    if (!formUsername.trim() || !formPassword) {
      setMsg("Login va parol kiriting");
      return;
    }
    if (formPassword !== formPassword2) {
      setMsg("Parollar mos emas");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const r = await api.admin.createUser({
        username: formUsername.trim(),
        password: formPassword,
        role: formRole,
      });
      if (!r.ok) {
        setMsg(r.error ?? "Xato");
        return;
      }
      setOkMsg(`✓ ${formUsername} yaratildi`);
      closeModal();
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xato");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    if (!formUsername.trim()) {
      setMsg("Login bo'sh bo'lmasin");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const r = await api.admin.updateUser(selected.id, {
        username: formUsername.trim(),
        role: formRole,
        active: formActive,
      });
      if (!r.ok) {
        setMsg(r.error ?? "Xato");
        return;
      }
      setOkMsg(`✓ ${formUsername} yangilandi`);
      closeModal();
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xato");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selected) return;
    if (!formPassword || formPassword.length < 4) {
      setMsg("Parol kamida 4 belgi");
      return;
    }
    if (formPassword !== formPassword2) {
      setMsg("Parollar mos emas");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const r = await api.admin.resetPassword(selected.id, formPassword);
      if (!r.ok) {
        setMsg(r.error ?? "Xato");
        return;
      }
      setOkMsg(r.message ?? "Parol yangilandi");
      closeModal();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xato");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: UserPublic) => {
    if (
      !window.confirm(
        `"${u.username}" ni o'chirish (faolsizlantirish)? Keyin tahrirlab qayta faollashtirish mumkin.`
      )
    ) {
      return;
    }
    setMsg("");
    try {
      const r = await api.admin.deleteUser(u.id);
      if (!r.ok) {
        setMsg(r.error ?? "Xato");
        return;
      }
      setOkMsg(`✓ ${u.username} o'chirildi (faol emas)`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xato");
    }
  };

  return (
    <div className="relative min-h-screen min-h-[100dvh] overflow-y-auto bg-[#020408] text-slate-100">
      <FuturisticBackground variant="login" />
      <div className="relative z-10 mx-auto max-w-4xl p-4 pb-10 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-bold text-amber-400">Admin panel</h1>
            <p className="text-[12px] text-slate-400">
              {username} · foydalanuvchilarni boshqarish
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onOpenMonitor && (
              <button
                type="button"
                onClick={onOpenMonitor}
                className="touch-target rounded border border-cyan-500/40 px-3 py-2 text-[11px] text-cyan-300"
              >
                Terminal
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="touch-target rounded border border-red-500/40 px-3 py-2 text-[11px] text-red-400"
            >
              Chiqish
            </button>
          </div>
        </div>

        {okMsg && (
          <p className="mb-3 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-[12px] text-emerald-400">
            {okMsg}
          </p>
        )}
        {msg && !modal && (
          <p className="mb-3 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-[12px] text-red-400">
            {msg}
          </p>
        )}

        <div className="fx-glass rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-bold text-cyan-400">Foydalanuvchilar</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openCreate}
                className="touch-target rounded-lg bg-amber-600 px-3 py-2 text-[11px] font-bold text-black"
              >
                + Yangi foydalanuvchi
              </button>
              <button
                type="button"
                onClick={load}
                className="touch-target rounded border border-slate-600 px-3 py-2 text-[11px] text-slate-400"
              >
                Yangilash
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-[12px] text-slate-500">Yuklanmoqda…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-500">
                    <th className="py-2 pr-2">Login</th>
                    <th className="py-2 pr-2">Rol</th>
                    <th className="py-2 pr-2">Holat</th>
                    <th className="py-2 pr-2">Yaratilgan</th>
                    <th className="py-2 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-800/80 ${!u.active ? "opacity-50" : ""}`}
                    >
                      <td className="py-2.5 font-medium">{u.username}</td>
                      <td className="py-2.5 text-violet-300">{u.role}</td>
                      <td className="py-2.5">
                        <span
                          className={
                            u.active ? "text-emerald-400" : "text-red-400"
                          }
                        >
                          {u.active ? "Faol" : "O'chirilgan"}
                        </span>
                      </td>
                      <td className="py-2.5 text-[10px] text-slate-500">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString("uz-UZ")
                          : "—"}
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="touch-target rounded border border-cyan-600/50 px-2 py-1 text-[10px] text-cyan-300"
                          >
                            Tahrirlash
                          </button>
                          <button
                            type="button"
                            onClick={() => openPassword(u)}
                            className="touch-target rounded border border-amber-600/50 px-2 py-1 text-[10px] text-amber-300"
                          >
                            Parol
                          </button>
                          {u.active && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(u)}
                              className="touch-target rounded border border-red-600/50 px-2 py-1 text-[10px] text-red-400"
                            >
                              O&apos;chirish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/30 p-3 text-[10px] text-slate-500">
          <p>
            O&apos;chirish = faolsizlantirish. Tahrirlash orqali qayta{" "}
            <b className="text-slate-400">Faol</b> qilish mumkin.
          </p>
          <a
            href={djangoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-cyan-500 hover:underline"
          >
            Django Admin (qo'shimcha) →
          </a>
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="fx-glass w-full max-w-md rounded-2xl border border-amber-500/30 p-4 sm:p-5">
            <h3 className="font-display text-lg font-bold text-amber-400">
              {modal === "create" && "Yangi foydalanuvchi"}
              {modal === "edit" && `Tahrirlash: ${selected?.username}`}
              {modal === "password" && `Parol: ${selected?.username}`}
            </h3>

            {msg && modal && (
              <p className="mt-2 text-[12px] text-red-400">{msg}</p>
            )}

            {(modal === "create" || modal === "edit") && (
              <div className="mt-4 space-y-3">
                <label className="block text-[11px] text-slate-400">
                  Login
                  <input
                    type="text"
                    autoComplete="off"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="fx-input mt-1 w-full rounded-lg px-3 py-2.5 text-base"
                  />
                </label>
                <label className="block text-[11px] text-slate-400">
                  Rol
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as "admin" | "user")}
                    className="fx-input mt-1 w-full rounded-lg px-3 py-2.5 text-base"
                  >
                    <option value="user">user — terminal</option>
                    <option value="admin">admin — to&apos;liq ruxsat</option>
                  </select>
                </label>
                {modal === "create" && (
                  <>
                    <label className="block text-[11px] text-slate-400">
                      Parol
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="fx-input mt-1 w-full rounded-lg px-3 py-2.5 text-base"
                      />
                    </label>
                    <label className="block text-[11px] text-slate-400">
                      Parol takror
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={formPassword2}
                        onChange={(e) => setFormPassword2(e.target.value)}
                        className="fx-input mt-1 w-full rounded-lg px-3 py-2.5 text-base"
                      />
                    </label>
                  </>
                )}
                {modal === "edit" && (
                  <label className="flex items-center gap-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Hisob faol
                  </label>
                )}
              </div>
            )}

            {modal === "password" && (
              <div className="mt-4 space-y-3">
                <label className="block text-[11px] text-slate-400">
                  Yangi parol
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="fx-input mt-1 w-full rounded-lg px-3 py-2.5 text-base"
                  />
                </label>
                <label className="block text-[11px] text-slate-400">
                  Takror
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={formPassword2}
                    onChange={(e) => setFormPassword2(e.target.value)}
                    className="fx-input mt-1 w-full rounded-lg px-3 py-2.5 text-base"
                  />
                </label>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void (modal === "create"
                    ? handleCreate()
                    : modal === "edit"
                      ? handleEdit()
                      : handleResetPassword())
                }
                className="touch-target flex-1 rounded-lg bg-amber-600 py-3 text-[12px] font-bold text-black disabled:opacity-50"
              >
                {saving ? "…" : modal === "password" ? "Parolni saqlash" : "Saqlash"}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="touch-target rounded-lg border border-slate-600 px-4 py-3 text-[12px] text-slate-400"
              >
                Bekor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
