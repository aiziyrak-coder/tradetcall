import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  accent?: "gold" | "cyan" | "green" | "red";
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

const accentBorder = {
  gold: "border-amber-500/40",
  cyan: "border-cyan-500/40",
  green: "border-emerald-500/40",
  red: "border-red-500/40",
};

export function PanelShell({ title, subtitle, accent = "gold", badge, children, footer }: Props) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-[var(--term-panel)] ${accentBorder[accent]}`}
    >
      <div className="term-panel-header flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider">{title}</h2>
          {subtitle && <p className="text-[10px] font-normal text-[var(--term-muted)]">{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div className="term-scroll min-h-0 flex-1 px-2 py-2">{children}</div>
      {footer && (
        <div className="shrink-0 border-t border-[var(--term-border)] p-2">{footer}</div>
      )}
    </div>
  );
}
