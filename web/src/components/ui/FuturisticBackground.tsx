interface Props {
  variant?: "login" | "admin" | "app";
}

export function FuturisticBackground({ variant = "login" }: Props) {
  const accent =
    variant === "admin"
      ? "from-violet-600/20 via-cyan-500/10 to-fuchsia-600/15"
      : "from-amber-500/15 via-cyan-400/10 to-emerald-500/15";

  return (
    <div className="fx-bg pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="fx-grid absolute inset-0 opacity-40" />
      <div className="fx-scanline absolute inset-0" />
      <div className="fx-orb fx-orb-1" />
      <div className="fx-orb fx-orb-2" />
      <div className="fx-orb fx-orb-3" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#020408_72%)]" />
    </div>
  );
}
