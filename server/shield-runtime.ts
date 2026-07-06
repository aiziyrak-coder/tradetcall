import fs from "fs";
import path from "path";
import { getDataDir } from "../shared/data-dir";

const DATA_DIR = getDataDir();
const FILE = path.join(DATA_DIR, "shield-runtime.json");

interface ShieldRuntime {
  pauseUntil: string | null;
  dateKey: string;
}

function load(): ShieldRuntime {
  try {
    if (fs.existsSync(FILE)) {
      return JSON.parse(fs.readFileSync(FILE, "utf8")) as ShieldRuntime;
    }
  } catch {
    /* */
  }
  const today = new Date().toISOString().slice(0, 10);
  return { pauseUntil: null, dateKey: today };
}

function save(data: ShieldRuntime): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

export function getPauseUntil(): string | null {
  const data = load();
  const today = new Date().toISOString().slice(0, 10);
  if (data.dateKey !== today) {
    save({ pauseUntil: null, dateKey: today });
    return null;
  }
  if (!data.pauseUntil) return null;
  if (new Date(data.pauseUntil).getTime() <= Date.now()) {
    save({ pauseUntil: null, dateKey: today });
    return null;
  }
  return data.pauseUntil;
}

export function triggerLossPause(cooldownMinutes: number): string {
  const until = new Date(Date.now() + cooldownMinutes * 60 * 1000).toISOString();
  save({ pauseUntil: until, dateKey: new Date().toISOString().slice(0, 10) });
  return until;
}

export function clearPause(): void {
  save({ pauseUntil: null, dateKey: new Date().toISOString().slice(0, 10) });
}
