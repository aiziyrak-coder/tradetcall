/** Anthropic API kalitini tozalash */
export function normalizeApiKey(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, "");
}

export function validateApiKeyFormat(key: string): string | null {
  const k = normalizeApiKey(key);
  if (!k) return "API kalit bo'sh";
  if (!k.startsWith("sk-ant-")) {
    return "Kalit sk-ant- bilan boshlanishi kerak (console.anthropic.com → API Keys)";
  }
  if (k.length < 50) {
    return `Kalit juda qisqa (${k.length} belgi). To'liq nusxalang.`;
  }
  return null;
}

export function apiKeyHint(key: string): string {
  const k = normalizeApiKey(key);
  if (!k) return "";
  return `${k.slice(0, 16)}… (${k.length} belgi)`;
}

export function formatApiError(e: unknown): string {
  const status = getErrorStatus(e);
  const apiMsg = getErrorMessage(e);

  if (
    status === 401 ||
    apiMsg.includes("invalid x-api-key") ||
    apiMsg.includes("authentication_error")
  ) {
    return [
      "Anthropic API kalit qabul qilinmadi (401).",
      "• console.anthropic.com → API Keys (Claude.ai emas)",
      "• «Eski kalitni o'chirish» → yangi kalit → Tekshirish",
      "• Kalit to'liq: sk-ant-api03-... yoki sk-ant-api04-...",
      apiMsg && apiMsg.length < 120 ? `• ${apiMsg}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (status === 403) {
    return "API ruxsat yo'q yoki balans tugagan (403).";
  }
  if (status === 404) {
    return "Model topilmadi (404). Dastur yangilanadi.";
  }
  if (status === 429) {
    return "Juda ko'p so'rov (429). Biroz kuting.";
  }
  if (apiMsg && apiMsg.length < 280) return apiMsg;
  if (e instanceof Error && e.message.length < 280) return e.message;
  return "API ulanish xatosi";
}

function getErrorStatus(e: unknown): number | undefined {
  if (e && typeof e === "object" && "status" in e) {
    return (e as { status?: number }).status;
  }
  return undefined;
}

function getErrorMessage(e: unknown): string {
  if (!e || typeof e !== "object") {
    return e instanceof Error ? e.message : "";
  }
  const err = e as {
    message?: string;
    error?: { type?: string; message?: string };
  };
  let msg = err.error?.message ?? err.message ?? "";
  if (msg.includes("{")) {
    try {
      const parsed = JSON.parse(msg) as { error?: { message?: string } };
      if (parsed.error?.message) msg = parsed.error.message;
    } catch {
      /* ignore */
    }
  }
  return msg;
}
