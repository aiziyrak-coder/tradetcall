import type { ReactNode } from "react";

type Accent = "gold" | "violet" | "cyan" | "amber" | "neutral";

const accentBorder: Record<Accent, string> = {
  gold: "border-[var(--term-gold)]/35",
  violet: "border-violet-500/40",
  cyan: "border-cyan-500/30",
  amber: "border-amber-500/35",
  neutral: "border-[var(--term-border)]",
};

const accentTitle: Record<Accent, string> = {
  gold: "text-[var(--term-gold)]",
  violet: "text-violet-300",
  cyan: "text-cyan-300",
  amber: "text-amber-300",
  neutral: "text-[var(--term-muted)]",
};

interface Props {
  title: string;
  subtitle?: string;
  accent?: Accent;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
}

export function TermCard({
  title,
  subtitle,
  accent = "neutral",
  children,
  className = "",
  headerExtra,
}: Props) {
  return (
    <div
      className={`term-card flex h-full min-h-0 flex-col overflow-hidden ${accentBorder[accent]} ${className}`}
    >
      <div className="term-card-header shrink-0 px-2 py-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className={`text-[10px] font-bold uppercase tracking-wider ${accentTitle[accent]}`}>
              {title}
            </h2>
            {subtitle && <p className="text-[7px] leading-tight text-[var(--term-muted)]">{subtitle}</p>}
          </div>
          {headerExtra}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
