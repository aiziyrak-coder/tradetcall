import type { Session, UserPublic } from "../shared/types";

const DJANGO_URL = (process.env.DJANGO_AUTH_URL || "http://127.0.0.1:8070").replace(
  /\/$/,
  ""
);

async function djangoFetch<T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (init?.token) headers.Authorization = `Bearer ${init.token}`;

  const res = await fetch(`${DJANGO_URL}${path}`, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || res.statusText || "Django auth xatosi");
  return body;
}

export function getDjangoAdminUrl(): string {
  return `${DJANGO_URL}/admin/`;
}

export async function djangoLogin(
  username: string,
  password: string
): Promise<{ ok: boolean; session?: Session; token?: string; error?: string }> {
  try {
    const data = await djangoFetch<{
      ok: boolean;
      token?: string;
      session?: Session;
      error?: string;
    }>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (!data.ok || !data.token || !data.session) {
      return { ok: false, error: data.error || "Login xatosi" };
    }
    return { ok: true, session: data.session, token: data.token };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Auth server ulanmadi",
    };
  }
}

export async function djangoGetSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const data = await djangoFetch<{ session: Session | null }>("/api/auth/me/", { token });
    return data.session ?? null;
  } catch {
    return null;
  }
}

export async function djangoListUsers(
  token: string
): Promise<{ ok: boolean; users?: UserPublic[]; error?: string }> {
  try {
    const data = await djangoFetch<{ ok: boolean; users?: UserPublic[] }>(
      "/api/auth/users/",
      { token }
    );
    return { ok: true, users: data.users ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Xato" };
  }
}

export async function djangoCreateUser(
  token: string,
  body: { username: string; password: string; role: "admin" | "user" }
): Promise<{ ok: boolean; user?: UserPublic; error?: string }> {
  try {
    const data = await djangoFetch<{ ok: boolean; user?: UserPublic }>(
      "/api/auth/users/",
      { method: "POST", token, body: JSON.stringify(body) }
    );
    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Xato" };
  }
}

export async function djangoUpdateUser(
  token: string,
  id: string,
  body: { username?: string; role?: "admin" | "user"; active?: boolean }
): Promise<{ ok: boolean; user?: UserPublic; error?: string }> {
  try {
    const data = await djangoFetch<{ ok: boolean; user?: UserPublic }>(
      `/api/auth/users/${id}/`,
      { method: "PATCH", token, body: JSON.stringify(body) }
    );
    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Xato" };
  }
}

export async function djangoDeleteUser(
  token: string,
  id: string
): Promise<{ ok: boolean; user?: UserPublic; error?: string }> {
  try {
    const data = await djangoFetch<{ ok: boolean; user?: UserPublic }>(
      `/api/auth/users/${id}/`,
      { method: "DELETE", token }
    );
    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Xato" };
  }
}

export async function djangoResetUserPassword(
  token: string,
  id: string,
  password: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const data = await djangoFetch<{ ok: boolean; message?: string }>(
      `/api/auth/users/${id}/reset-password/`,
      { method: "POST", token, body: JSON.stringify({ password }) }
    );
    return { ok: true, message: data.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Xato" };
  }
}

export async function djangoHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${DJANGO_URL}/admin/login/`, { method: "GET" });
    return res.ok || res.status === 302;
  } catch {
    return false;
  }
}
