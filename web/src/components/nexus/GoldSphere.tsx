import { useEffect, useRef } from "react";

/** Aylanuvchi oltin zarrachalar shar — canvas 3D */
export function GoldSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let size = 280;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const points: { x: number; y: number; z: number }[] = [];
    const N = 520;
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      points.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
    }

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      size = Math.min(parent.clientWidth, parent.clientHeight, 340);
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const drawRing = (ry: number, rz: number, radius: number, alpha: number) => {
      const segs = 64;
      ctx.beginPath();
      for (let i = 0; i <= segs; i++) {
        const t = (i / segs) * Math.PI * 2;
        let x = Math.cos(t) * radius;
        let z = Math.sin(t) * radius;
        const y = 0;
        const x1 = x * Math.cos(ry) - z * Math.sin(ry);
        const z1 = x * Math.sin(ry) + z * Math.cos(ry);
        const y2 = y * Math.cos(rz) - z1 * Math.sin(rz);
        const z2 = y * Math.sin(rz) + z1 * Math.cos(rz);
        const scale = 1 / (2.2 - z2);
        const px = size / 2 + x1 * scale;
        const py = size / 2 + y2 * scale + size * 0.08;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(255, 213, 79, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      angleRef.current += 0.006;
      const ay = angleRef.current;
      const ax = angleRef.current * 0.35;
      const cx = size / 2;
      const cy = size / 2;
      const R = size * 0.34;

      const glow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.4);
      glow.addColorStop(0, "rgba(255, 213, 79, 0.18)");
      glow.addColorStop(0.5, "rgba(255, 160, 0, 0.06)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      const rotated = points.map((p) => {
        let x = p.x * Math.cos(ay) - p.z * Math.sin(ay);
        let z = p.x * Math.sin(ay) + p.z * Math.cos(ay);
        let y = p.y;
        const y2 = y * Math.cos(ax) - z * Math.sin(ax);
        const z2 = y * Math.sin(ax) + z * Math.cos(ax);
        return { x, y: y2, z: z2 };
      });
      rotated.sort((a, b) => a.z - b.z);

      for (const p of rotated) {
        const scale = 1 / (2.4 - p.z);
        const px = cx + p.x * R * scale;
        const py = cy + p.y * R * scale;
        const alpha = 0.25 + (p.z + 1) * 0.38;
        const dot = 0.8 + (p.z + 1) * 1.1;
        ctx.beginPath();
        ctx.arc(px, py, dot, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${200 + Math.floor(p.z * 30)}, 60, ${alpha})`;
        if (p.z > 0.2) {
          ctx.shadowColor = "rgba(255, 213, 79, 0.9)";
          ctx.shadowBlur = 5;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      drawRing(ay, ax, R * 1.05, 0.25);
      drawRing(ay + 0.5, ax, R * 1.18, 0.12);

      const baseY = cy + R * 0.92;
      const baseGrad = ctx.createLinearGradient(cx - R, baseY, cx + R, baseY);
      baseGrad.addColorStop(0, "transparent");
      baseGrad.addColorStop(0.5, "rgba(255, 213, 79, 0.35)");
      baseGrad.addColorStop(1, "transparent");
      ctx.strokeStyle = baseGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, baseY, R * 0.9, R * 0.12, 0, 0, Math.PI * 2);
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="nx-sphere-canvas" aria-hidden />;
}
