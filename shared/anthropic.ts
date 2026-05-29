import Anthropic from "@anthropic-ai/sdk";
import {
  apiKeyHint,
  formatApiError,
  normalizeApiKey,
  validateApiKeyFormat,
} from "./api-key";
import { CLAUDE_MODEL_PRIMARY, CLAUDE_MODELS } from "./models";

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

  try {
    await fetchTest(normalized, CLAUDE_MODEL_PRIMARY);
    return { hint: apiKeyHint(normalized), model: CLAUDE_MODEL_PRIMARY };
  } catch (e) {
    throw new Error(formatApiError(e));
  }
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

  try {
    const response = await createMessage(CLAUDE_MODEL_PRIMARY, system, userMessage, maxTokens);
    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new Error("Claude javob bermadi");
    return block.text;
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 404 && CLAUDE_MODELS.length > 1) {
      for (const model of CLAUDE_MODELS.slice(1)) {
        try {
          const response = await createMessage(model, system, userMessage, maxTokens);
          const block = response.content.find((b) => b.type === "text");
          if (!block || block.type !== "text") throw new Error("Claude javob bermadi");
          return block.text;
        } catch (inner) {
          const innerStatus = (inner as { status?: number })?.status;
          if (innerStatus === 401 || innerStatus === 403) throw new Error(formatApiError(inner));
          if (innerStatus === 404) continue;
          throw new Error(formatApiError(inner));
        }
      }
    }
    throw new Error(formatApiError(e));
  }
}
