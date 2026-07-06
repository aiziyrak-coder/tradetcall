import fs from "fs";
import path from "path";
import { normalizeApiKey } from "../shared/api-key";
import { getDataDir } from "../shared/data-dir";
import type { TranslationCache } from "../shared/translate";

const DATA_DIR = getDataDir();
const STORE_PATH = path.join(DATA_DIR, "store.json");

interface AppStore {
  apiKey: string;
  translationCache: TranslationCache;
}

const defaults: AppStore = {
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
  const env =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim();
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
