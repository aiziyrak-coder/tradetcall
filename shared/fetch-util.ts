const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchJson<T>(
  url: string,
  opts?: { timeoutMs?: number; headers?: Record<string, string>; retries?: number }
): Promise<T | null> {
  const timeoutMs = opts?.timeoutMs ?? 10_000;
  const retries = opts?.retries ?? 1;
  const headers = { "User-Agent": DEFAULT_UA, ...opts?.headers };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch {
      if (attempt === retries) return null;
      await sleep(400 * (attempt + 1));
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export { DEFAULT_UA };
