import fs from "fs";
import path from "path";
import { normalizeApiKey } from "../shared/api-key";
import type { TranslationCache } from "../shared/translate";
import type { UserRecord } from "../shared/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

interface AppStore {
  users: UserRecord[];
  apiKey: string;
  translationCache: TranslationCache;
}

const defaults: AppStore = {
  users: [],
  apiKey: "",
  translationCache: {},
};

let memory: AppStore | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load(): AppStore {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) return { ...defaults };
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Partial<AppStore>;
    return {
      users: raw.users ?? [],
      apiKey: raw.apiKey ?? "",
      translationCache: raw.translationCache ?? {},
    };
  } catch {
    return { ...defaults };
  }
}

function persist(): void {
  if (!memory) return;
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(memory, null, 2), "utf8");
}

export function getStoreData(): AppStore {
  if (!memory) memory = load();
  return memory;
}

export function getApiKey(): string {
  const env = process.env.ANTHROPIC_API_KEY?.trim();
  if (env) return env;
  return getStoreData().apiKey;
}

export function setApiKey(key: string): void {
  const s = getStoreData();
  s.apiKey = normalizeApiKey(key);
  persist();
}

export function getTranslationCache(): TranslationCache {
  return getStoreData().translationCache;
}

export function setTranslationCache(cache: TranslationCache): void {
  const s = getStoreData();
  s.translationCache = cache;
  persist();
}

export function getUsersFromStore(): UserRecord[] {
  return getStoreData().users;
}

export function saveUsersToStore(users: UserRecord[]): void {
  const s = getStoreData();
  s.users = users;
  persist();
}
