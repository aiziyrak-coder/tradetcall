import {
  apiKeyHint,
  formatApiError,
  normalizeApiKey,
  validateApiKeyFormat,
} from "./api-key";
import { DEEPSEEK_MODEL_PRIMARY, DEEPSEEK_MODELS } from "./models";

const API_URL = "https://api.deepseek.com/chat/completions";

let currentKey = "";

export function setApiKey(key: string) {
  currentKey = normalizeApiKey(key);
}

export function getApiKey(): string {
  return currentKey;
}

export function clearEnvApiKeys(): void {
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
}

async function chatCompletion(
  key: string,
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number
): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.25,
      stream: false,
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

  let content = "";
  try {
    const j = JSON.parse(text) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    content = j.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    throw new Error("DeepSeek javob formati noto'g'ri");
  }
  if (!content) throw new Error("DeepSeek bo'sh javob qaytardi");
  return content;
}

export async function testApiKey(key: string): Promise<{ hint: string; model: string }> {
  clearEnvApiKeys();
  const normalized = normalizeApiKey(key);
  const formatErr = validateApiKeyFormat(normalized);
  if (formatErr) throw new Error(formatErr);

  try {
    await chatCompletion(normalized, DEEPSEEK_MODEL_PRIMARY, "Test", "OK", 8);
    return { hint: apiKeyHint(normalized), model: DEEPSEEK_MODEL_PRIMARY };
  } catch (e) {
    throw new Error(formatApiError(e));
  }
}

export async function askDeepSeek(
  system: string,
  userMessage: string,
  maxTokens = 512
): Promise<string> {
  clearEnvApiKeys();
  const formatErr = validateApiKeyFormat(currentKey);
  if (formatErr || !currentKey) {
    throw new Error(formatErr ?? "API kalit kiritilmagan. Sozlamalarga o'ting.");
  }

  try {
    return await chatCompletion(
      currentKey,
      DEEPSEEK_MODEL_PRIMARY,
      system,
      userMessage,
      maxTokens
    );
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 404 && DEEPSEEK_MODELS.length > 1) {
      for (const model of DEEPSEEK_MODELS.slice(1)) {
        try {
          return await chatCompletion(currentKey, model, system, userMessage, maxTokens);
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
