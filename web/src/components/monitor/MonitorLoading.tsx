import { UZ } from "../../lib/uz";

export function MonitorLoading() {
  return (
    <div className="monitor-loading flex h-screen flex-col items-center justify-center gap-4 bg-[var(--term-bg)]">
      <div className="relative">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-[var(--term-gold)]/30 border-t-[var(--term-gold)]" />
        <span className="absolute inset-0 flex items-center justify-center text-xl">🥇</span>
      </div>
      <div className="text-center">
        <p className="font-display text-sm font-bold tracking-wider text-[var(--term-gold)]">{UZ.appTitle}</p>
        <p className="mt-1 text-[10px] text-[var(--term-muted)]">{UZ.subtitle}</p>
        <p className="mt-3 font-mono-ui text-[9px] text-slate-500">Terminal yuklanmoqda…</p>
      </div>
    </div>
  );
}
