import { v4 as uuidv4 } from "uuid";
import type { Session } from "../shared/types";

const sessions = new Map<string, Session>();

export function createSessionToken(session: Session): string {
  const id = uuidv4();
  sessions.set(id, session);
  return id;
}

export function getSessionByToken(token: string | undefined): Session | null {
  if (!token) return null;
  return sessions.get(token) ?? null;
}

export function destroySessionToken(token: string | undefined): void {
  if (token) sessions.delete(token);
}
