/** Markaz — faqat statik oltin nur, aylanuvchi 3D effektsiz */
export function HolographicGlobe() {
  return (
    <div className="relative h-full w-full min-h-[280px]">
      <div
        className="absolute left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
        style={{
          background: "radial-gradient(circle, rgba(255,184,0,0.12) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
