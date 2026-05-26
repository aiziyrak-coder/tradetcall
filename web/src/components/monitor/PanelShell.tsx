import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  accent?: "gold" | "cyan" | "green" | "red";
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
  /** false = kontent balandligicha (PLATFORM PRO), true = panel to‘ldiradi */
  fillHeight?: boolean;
}

const accentBorder = {
  gold: "border-amber-500/40",
  cyan: "border-cyan-500/40",
  green: "border-emerald-500/40",
  red: "border-red-500/40",
};

export function PanelShell({
  title,
  subtitle,
  accent = "gold",
  badge,
  children,
  footer,
  compact,
  fillHeight = true,
}: Props) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-md border bg-[var(--term-panel)] ${accentBorder[accent]} ${
        fillHeight ? "h-full min-h-0" : "h-auto"
      }`}
    >
      <div
        className={`term-panel-header flex shrink-0 items-center justify-between gap-1 ${compact ? "px-2 py-1" : "px-3 py-2"}`}
      >
        <div>
          <h2 className={`font-bold uppercase tracking-wider ${compact ? "text-[9px]" : "text-[11px]"}`}>
            {title}
          </h2>
          {subtitle && (
            <p className={`font-normal text-[var(--term-muted)] ${compact ? "text-[8px]" : "text-[10px]"}`}>
              {subtitle}
            </p>
          )}
        </div>
        {badge}
      </div>
      <div
        className={`${
          fillHeight ? "min-h-0 flex-1 overflow-hidden" : ""
        } ${compact ? "px-1.5 py-1" : "term-scroll px-2 py-2"}`}
      >
        {children}
      </div>
      {footer && (
        <div className={`shrink-0 border-t border-[var(--term-border)] ${compact ? "p-1" : "p-2"}`}>
          {footer}
        </div>
      )}
    </div>
  );
}
