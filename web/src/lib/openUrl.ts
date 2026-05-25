export function openUrl(url: string): void {
  const u = url?.trim();
  if (!u) return;
  window.open(u, "_blank", "noopener,noreferrer");
}
