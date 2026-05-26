import type { Session, UserPublic } from "../shared/types";
import {
  djangoCreateUser,
  djangoDeleteUser,
  djangoGetSession,
  djangoListUsers,
  djangoLogin,
  djangoResetUserPassword,
  djangoUpdateUser,
  getDjangoAdminUrl,
} from "./django-client";

export { getDjangoAdminUrl };

export function login(
  username: string,
  password: string
): Promise<{ ok: boolean; session?: Session; token?: string; error?: string }> {
  return djangoLogin(username, password);
}

export function logout(_token: string | undefined): void {
  /* JWT — cookie tozalanadi */
}

export function getSession(token: string | undefined): Promise<Session | null> {
  return djangoGetSession(token);
}

export function listUsersWithToken(
  token: string | undefined
): Promise<{ ok: boolean; users?: UserPublic[]; error?: string }> {
  if (!token) return Promise.resolve({ ok: false, error: "Token yo'q" });
  return djangoListUsers(token);
}

export function createUserWithToken(
  token: string | undefined,
  body: { username: string; password: string; role: "admin" | "user" }
) {
  if (!token) return Promise.resolve({ ok: false, error: "Token yo'q" });
  return djangoCreateUser(token, body);
}

export function updateUserWithToken(
  token: string | undefined,
  id: string,
  body: { username?: string; role?: "admin" | "user"; active?: boolean }
) {
  if (!token) return Promise.resolve({ ok: false, error: "Token yo'q" });
  return djangoUpdateUser(token, id, body);
}

export function deleteUserWithToken(token: string | undefined, id: string) {
  if (!token) return Promise.resolve({ ok: false, error: "Token yo'q" });
  return djangoDeleteUser(token, id);
}

export function resetUserPasswordWithToken(
  token: string | undefined,
  id: string,
  password: string
) {
  if (!token) return Promise.resolve({ ok: false, error: "Token yo'q" });
  return djangoResetUserPassword(token, id, password);
}
