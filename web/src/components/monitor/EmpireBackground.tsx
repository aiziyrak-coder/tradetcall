/** Futuristik moliya imperiyasi fon — faqat vizual, performance-friendly */
export function EmpireBackground() {
  return (
    <div className="empire-bg pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="empire-grid" />
      <div className="empire-orb empire-orb-gold" />
      <div className="empire-orb empire-orb-cyan" />
      <div className="empire-scanline" />
    </div>
  );
}
