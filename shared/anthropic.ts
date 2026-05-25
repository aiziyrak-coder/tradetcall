import Anthropic from "@anthropic-ai/sdk";
import {
  apiKeyHint,
  formatApiError,
  normalizeApiKey,
  validateApiKeyFormat,
} from "./api-key";
import { CLAUDE_MODELS } from "./models";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

let client: Anthropic | null = null;
let currentKey = "";

function createClient(key: string): Anthropic {
  return new Anthropic({
    apiKey: key,
    authToken: null,
    dangerouslyAllowBrowser: false,
  });
}

export function setApiKey(key: string) {
  currentKey = normalizeApiKey(key);
  client = currentKey ? createClient(currentKey) : null;
}

export function getApiKey(): string {
  return currentKey;
}

/** Tizim env dagi eski kalit SDK ni chalkashtirmasligi uchun */
export function clearEnvApiKeys(): void {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_AUTH_TOKEN;
}

async function fetchTest(key: string, model: string): Promise<void> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": API_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: 16,
      messages: [{ role: "user", content: "OK" }],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      msg = j.error?.message ?? text;
    } catch {
      /* raw */
    }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
}

export async function testApiKey(key: string): Promise<{ hint: string; model: string }> {
  clearEnvApiKeys();
  const normalized = normalizeApiKey(key);
  const formatErr = validateApiKeyFormat(normalized);
  if (formatErr) throw new Error(formatErr);

  let lastErr: unknown;
  for (const model of CLAUDE_MODELS) {
    try {
      await fetchTest(normalized, model);
      return { hint: apiKeyHint(normalized), model };
    } catch (e) {
      lastErr = e;
      const status = (e as { status?: number })?.status;
      if (status === 401 || status === 403) throw new Error(formatApiError(e));
      if (status === 404) continue;
      throw new Error(formatApiError(e));
    }
  }
  throw new Error(formatApiError(lastErr));
}

async function createMessage(
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number
) {
  if (!client) throw new Error("API kalit yo'q");
  return client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMessage }],
  });
}

export async function askClaude(
  system: string,
  userMessage: string,
  maxTokens = 4096
): Promise<string> {
  clearEnvApiKeys();
  const formatErr = validateApiKeyFormat(currentKey);
  if (formatErr || !client) {
    throw new Error(formatErr ?? "API kalit kiritilmagan. Sozlamalarga o'ting.");
  }

  let lastErr: unknown;
  for (const model of CLAUDE_MODELS) {
    try {
      const response = await createMessage(model, system, userMessage, maxTokens);
      const block = response.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") throw new Error("Claude javob bermadi");
      return block.text;
    } catch (e) {
      lastErr = e;
      const status = (e as { status?: number })?.status;
      if (status === 401 || status === 403) throw new Error(formatApiError(e));
      if (status === 404) continue;
      throw new Error(formatApiError(e));
    }
  }
  throw new Error(formatApiError(lastErr));
}
