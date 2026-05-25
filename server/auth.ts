import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type { Session, UserPublic, UserRecord, UserRole } from "../shared/types";
import { getUsersFromStore, saveUsersToStore } from "./store";
import { createSessionToken, destroySessionToken, getSessionByToken } from "./session";

const SEED_USERS: { username: string; password: string; role: UserRole }[] = [
  { username: "admin", password: "admin", role: "admin" },
  { username: "lynxos", password: "3888", role: "user" },
  { username: "ahror", password: "9930", role: "user" },
];

const SEED_SYNC_PASSWORDS = new Set(["lynxos", "ahror"]);

export function ensureSeedUsers(): void {
  let users = getUsersFromStore();

  for (const seed of SEED_USERS) {
    const u = seed.username.toLowerCase();
    let existing = users.find((x) => x.username === u);
    if (!existing) {
      users.push({
        id: uuidv4(),
        username: u,
        passwordHash: bcrypt.hashSync(seed.password, 10),
        role: seed.role,
        active: true,
        createdAt: new Date().toISOString(),
      });
      continue;
    }
    if (!existing.role) existing.role = seed.role;
    if (existing.active === undefined) existing.active = true;
    if (SEED_SYNC_PASSWORDS.has(u)) {
      existing.passwordHash = bcrypt.hashSync(seed.password, 10);
      existing.active = true;
    }
  }

  saveUsersToStore(users);
}

function getUsers(): UserRecord[] {
  return getUsersFromStore();
}

function requireAdmin(session: Session | null): Session | null {
  if (!session || session.role !== "admin") return null;
  return session;
}

export function login(
  username: string,
  password: string
): { ok: boolean; session?: Session; token?: string; error?: string } {
  ensureSeedUsers();
  const u = username.trim().toLowerCase();
  const users = getUsers();
  const user = users.find((x) => x.username === u);
  if (!user || !user.active) {
    return { ok: false, error: "Login yoki parol noto'g'ri" };
  }
  if (!bcrypt.compareSync(password, user.passwordHash)) {
    return { ok: false, error: "Login yoki parol noto'g'ri" };
  }
  const session: Session = {
    userId: user.id,
    username: user.username,
    role: user.role ?? "user",
  };
  const token = createSessionToken(session);
  return { ok: true, session, token };
}

export function logout(token: string | undefined): void {
  destroySessionToken(token);
}

export function getSession(token: string | undefined): Session | null {
  const s = getSessionByToken(token);
  if (!s) return null;
  const user = getUsers().find((x) => x.id === s.userId);
  if (!user || !user.active) {
    logout(token);
    return null;
  }
  return { ...s, role: user.role ?? "user" };
}

export function listUsers(session: Session | null): { ok: boolean; users?: UserPublic[]; error?: string } {
  if (!requireAdmin(session)) return { ok: false, error: "Ruxsat yo'q" };
  const users = getUsers().map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role ?? "user",
    active: u.active !== false,
    createdAt: u.createdAt,
  }));
  return { ok: true, users };
}

export function createUser(
  session: Session | null,
  username: string,
  password: string,
  role: UserRole = "user"
): { ok: boolean; user?: UserPublic; error?: string } {
  const admin = requireAdmin(session);
  if (!admin) return { ok: false, error: "Ruxsat yo'q" };

  const u = username.trim().toLowerCase();
  if (u.length < 3) return { ok: false, error: "Login kamida 3 belgi" };
  if (password.length < 4) return { ok: false, error: "Parol kamida 4 belgi" };

  const users = getUsers();
  if (users.some((x) => x.username === u)) {
    return { ok: false, error: "Bu login band" };
  }

  const record: UserRecord = {
    id: uuidv4(),
    username: u,
    passwordHash: bcrypt.hashSync(password, 10),
    role,
    active: true,
    createdAt: new Date().toISOString(),
  };
  users.push(record);
  saveUsersToStore(users);

  return {
    ok: true,
    user: {
      id: record.id,
      username: record.username,
      role: record.role,
      active: true,
      createdAt: record.createdAt,
    },
  };
}

export function updateUser(
  session: Session | null,
  id: string,
  patch: { password?: string; role?: UserRole; active?: boolean }
): { ok: boolean; error?: string } {
  const admin = requireAdmin(session);
  if (!admin) return { ok: false, error: "Ruxsat yo'q" };

  const users = getUsers();
  const idx = users.findIndex((x) => x.id === id);
  if (idx < 0) return { ok: false, error: "Foydalanuvchi topilmadi" };

  const target = users[idx];
  if (patch.password !== undefined) {
    if (patch.password.length < 4) return { ok: false, error: "Parol kamida 4 belgi" };
    target.passwordHash = bcrypt.hashSync(patch.password, 10);
  }
  if (patch.role !== undefined) target.role = patch.role;
  if (patch.active !== undefined) {
    if (!patch.active && target.id === admin.userId) {
      return { ok: false, error: "O'zingizni o'chirib bo'lmaydi" };
    }
    const admins = users.filter((x) => (x.role ?? "user") === "admin" && x.active !== false);
    if (!patch.active && (target.role ?? "user") === "admin" && admins.length <= 1) {
      return { ok: false, error: "Oxirgi adminni o'chirib bo'lmaydi" };
    }
    target.active = patch.active;
  }

  users[idx] = target;
  saveUsersToStore(users);
  return { ok: true };
}

export function deleteUser(session: Session | null, id: string): { ok: boolean; error?: string } {
  const admin = requireAdmin(session);
  if (!admin) return { ok: false, error: "Ruxsat yo'q" };
  if (id === admin.userId) return { ok: false, error: "O'zingizni o'chirib bo'lmaydi" };

  const users = getUsers();
  const target = users.find((x) => x.id === id);
  if (!target) return { ok: false, error: "Topilmadi" };

  const admins = users.filter((x) => (x.role ?? "user") === "admin" && x.active !== false);
  if ((target.role ?? "user") === "admin" && admins.length <= 1) {
    return { ok: false, error: "Oxirgi adminni o'chirib bo'lmaydi" };
  }

  saveUsersToStore(users.filter((x) => x.id !== id));
  return { ok: true };
}
