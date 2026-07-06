import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export function EmpireBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    type P = { x: number; y: number; vx: number; vy: number; s: number; a: number };
    const pts: P[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      if (pts.length < 80) {
        pts.length = 0;
        for (let i = 0; i < 90; i++) {
          pts.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.1 - 0.05,
            s: Math.random() * 1.5 + 0.5,
            a: Math.random() * 0.5 + 0.2,
          });
        }
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 213, 74, ${p.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255,184,0,0.12), transparent 65%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(255,213,74,0.06), transparent), linear-gradient(180deg, #050505, #000)",
        }}
      />
      <div className="empire-grid-bg absolute inset-0" />
      <motion.div
        className="absolute left-1/2 top-[30%] h-[50%] w-[80%] -translate-x-1/2"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255,213,74,0.1), transparent 70%)",
        }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-30" preserveAspectRatio="none">
        <defs>
          <linearGradient id="aurora" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,213,74,0)" />
            <stop offset="50%" stopColor="rgba(255,184,0,0.15)" />
            <stop offset="100%" stopColor="rgba(255,213,74,0)" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0,200 Q200,100 400,180 T800,150"
          fill="none"
          stroke="url(#aurora)"
          strokeWidth="2"
          animate={{ d: ["M0,200 Q200,100 400,180 T800,150", "M0,180 Q200,120 400,160 T800,170", "M0,200 Q200,100 400,180 T800,150"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
