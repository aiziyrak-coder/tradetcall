export function extractJSON<T>(text: string): T {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const arrStart = raw.indexOf("[");
  const useArr = arrStart >= 0 && (start < 0 || arrStart < start);
  if (useArr) {
    const end = raw.lastIndexOf("]");
    if (end < arrStart) throw new Error("JSON topilmadi");
    return JSON.parse(raw.slice(arrStart, end + 1)) as T;
  }
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("JSON topilmadi");
  return JSON.parse(raw.slice(start, end + 1)) as T;
}
