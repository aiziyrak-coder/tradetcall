import type { ReactNode, CSSProperties } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GlassCard({ children, className = "", style }: Props) {
  return (
    <div className={`empire-glass ${className}`} style={style}>
      {children}
    </div>
  );
}
