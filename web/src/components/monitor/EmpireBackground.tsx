/** Futuristik moliya imperiyasi fon */
export function EmpireBackground() {
  return (
    <div className="empire-bg pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="empire-nebula empire-nebula--1" />
      <div className="empire-nebula empire-nebula--2" />
      <div className="empire-grid" />
      <div className="empire-hex-field" />
      <div className="empire-orb empire-orb-gold" />
      <div className="empire-orb empire-orb-cyan" />
      <div className="empire-orb empire-orb-magenta" />
      <div className="empire-scanline" />
      <div className="empire-vignette" />
    </div>
  );
}
