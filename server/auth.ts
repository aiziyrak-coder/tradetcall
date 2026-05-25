import type { Session, UserPublic } from "../shared/types";
import {
  djangoGetSession,
  djangoListUsers,
  djangoLogin,
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
