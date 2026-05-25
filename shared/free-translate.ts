/** Onlayn tarjima en → o'zbek */

const GLOSSARY: [RegExp, string][] = [
  [/\bgold\b/gi, "oltin"],
  [/\bxauusd\b/gi, "XAUUSD"],
  [/\bxau\/usd\b/gi, "XAU/USD"],
  [/\bcomex\b/gi, "COMEX"],
  [/\bfed\b/gi, "FED"],
  [/\bfomc\b/gi, "FOMC"],
  [/\bdxy\b/gi, "DXY"],
  [/\bcpi\b/gi, "CPI"],
  [/\bppi\b/gi, "PPI"],
  [/\bnfp\b/gi, "NFP"],
  [/\bsafe haven\b/gi, "xavfsiz boshpana"],
  [/\brate cut\b/gi, "stavka pasaytirish"],
  [/\brate hike\b/gi, "stavka oshirish"],
  [/\bweak dollar\b/gi, "zaif dollar"],
  [/\bstrong dollar\b/gi, "kuchli dollar"],
  [/\btreasury yields?\b/gi, "treasury rentasi"],
  [/\bgeopolitical\b/gi, "geosiyosiy"],
  [/\binflation\b/gi, "inflyatsiya"],
  [/\brecession\b/gi, "recessiya"],
  [/\bcentral bank\b/gi, "markaziy bank"],
];

export function polishTradingUz(text: string): string {
  let out = text;
  for (const [re, rep] of GLOSSARY) out = out.replace(re, rep);
  return out.replace(/\s+/g, " ").trim();
}

/** Sarlavha hali inglizcha ekanini taxmin qilish */
export function isLikelyEnglish(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/o[''`]|\bg[''`]|gʻ|o'l|bo'l|uchun|bilan|narx|oltin|inflyatsiya|sanktsiya|urush|foiz/i.test(t)) {
    return false;
  }
  return /\b(the|and|for|with|gold|price|market|fed|rate|will|says|after)\b/i.test(t);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateGoogleGtx(text: string): Promise<string | null> {
  const q = encodeURIComponent(text.slice(0, 480));
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=uz&dt=t&q=${q}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; XAUUSD-Trade/3)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const parts = (data[0] as unknown[])
    .map((row) => (Array.isArray(row) ? String(row[0] ?? "") : ""))
    .join("");
  return parts.trim() || null;
}

async function translateMyMemory(text: string): Promise<string | null> {
  const q = encodeURIComponent(text.slice(0, 450));
  const email = process.env.MYMEMORY_EMAIL?.trim();
  const extra = email ? `&de=${encodeURIComponent(email)}` : "";
  const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=en|uz${extra}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(14_000) });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  const out = data.responseData?.translatedText?.trim();
  if (!out || data.responseStatus === 429) return null;
  if (/MYMEMORY WARNING|INVALID/i.test(out)) return null;
  return out;
}

/** Bitta matn: en → o'zbek */
export async function translateEnToUz(text: string): Promise<string> {
  const src = text.trim();
  if (!src) return src;
  if (!isLikelyEnglish(src)) return polishTradingUz(src);

  const gtx = await translateGoogleGtx(src);
  if (gtx && !isLikelyEnglish(gtx)) return polishTradingUz(gtx);

  await sleep(400);
  const mm = await translateMyMemory(src);
  if (mm && !isLikelyEnglish(mm)) return polishTradingUz(mm);

  return gtx ? polishTradingUz(gtx) : polishTradingUz(src);
}

/** Ketma-ket (rate limit) */
export async function translateBatchEnToUz(
  texts: string[],
  delayMs = 350
): Promise<string[]> {
  const out: string[] = [];
  for (const t of texts) {
    out.push(await translateEnToUz(t));
    if (delayMs > 0) await sleep(delayMs);
  }
  return out;
}
