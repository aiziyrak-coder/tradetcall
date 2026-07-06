import {
  apiKeyHint,
  formatApiError,
  normalizeApiKey,
  validateApiKeyFormat,
} from "./api-key";
import { OPENAI_MODEL_PRIMARY, OPENAI_MODELS } from "./models";

const API_URL = "https://api.openai.com/v1/chat/completions";

let currentKey = "";

export function setApiKey(key: string) {
  currentKey = normalizeApiKey(key);
}

export function getApiKey(): string {
  return currentKey;
}

export function clearEnvApiKeys(): void {
  delete process.env.OPENAI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
}

async function chatCompletion(
  key: string,
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number,
  jsonMode = true
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature: 0.05,
    top_p: 0.88,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
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

  let content = "";
  try {
    const j = JSON.parse(text) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    content = j.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    throw new Error("OpenAI javob formati noto'g'ri");
  }
  if (!content) throw new Error("OpenAI bo'sh javob qaytardi");
  return content;
}

export async function testApiKey(key: string): Promise<{ hint: string; model: string }> {
  clearEnvApiKeys();
  const normalized = normalizeApiKey(key);
  const formatErr = validateApiKeyFormat(normalized);
  if (formatErr) throw new Error(formatErr);

  try {
    await chatCompletion(normalized, OPENAI_MODEL_PRIMARY, "Test", "OK", 8, false);
    return { hint: apiKeyHint(normalized), model: OPENAI_MODEL_PRIMARY };
  } catch (e) {
    throw new Error(formatApiError(e));
  }
}

export async function askOpenAI(
  system: string,
  userMessage: string,
  maxTokens = 1024
): Promise<string> {
  clearEnvApiKeys();
  const formatErr = validateApiKeyFormat(currentKey);
  if (formatErr || !currentKey) {
    throw new Error(formatErr ?? "API kalit kiritilmagan. Sozlamalarga o'ting.");
  }

  try {
    return await chatCompletion(
      currentKey,
      OPENAI_MODEL_PRIMARY,
      system,
      userMessage,
      maxTokens,
      true
    );
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 404 && OPENAI_MODELS.length > 1) {
      for (const model of OPENAI_MODELS.slice(1)) {
        try {
          return await chatCompletion(currentKey, model, system, userMessage, maxTokens, true);
        } catch (inner) {
          const innerStatus = (inner as { status?: number })?.status;
          if (innerStatus === 401 || innerStatus === 403) {
            throw new Error(formatApiError(inner));
          }
          if (innerStatus === 404) continue;
          throw new Error(formatApiError(inner));
        }
      }
    }
    throw new Error(formatApiError(e));
  }
}
