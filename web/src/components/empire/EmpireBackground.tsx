/** Statik fon — aylanuvchi zarracha va aurora yo'q */
export function EmpireBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255,184,0,0.08), transparent 65%), linear-gradient(180deg, #050505, #000)",
        }}
      />
      <div className="empire-grid-bg absolute inset-0 opacity-60" />
    </div>
  );
}
