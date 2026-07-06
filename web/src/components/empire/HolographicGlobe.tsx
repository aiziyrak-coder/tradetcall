import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function GoldParticleSphere() {
  const ref = useRef<THREE.Points>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);

  const particles = useMemo(() => {
    const n = 2800;
    const arr = new Float32Array(n * 3);
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const rad = 1.85;
      arr[i * 3] = Math.cos(theta) * r * rad;
      arr[i * 3 + 1] = y * rad;
      arr[i * 3 + 2] = Math.sin(theta) * r * rad;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.12;
    if (ring1.current) ring1.current.rotation.z += delta * 0.25;
    if (ring2.current) {
      ring2.current.rotation.x += delta * 0.18;
      ring2.current.rotation.y += delta * 0.1;
    }
    if (ring3.current) ring3.current.rotation.y -= delta * 0.15;
  });

  return (
    <group>
      <ambientLight intensity={0.15} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color="#ffd54a" />
      <pointLight position={[-3, -2, 2]} intensity={0.4} color="#ffb800" />

      <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#ffd54a"
          size={0.028}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.85}
        />
      </Points>

      <mesh ref={ring1}>
        <torusGeometry args={[2.15, 0.012, 8, 128]} />
        <meshBasicMaterial color="#ffe88b" transparent opacity={0.35} />
      </mesh>
      <mesh ref={ring2} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.35, 0.008, 8, 128]} />
        <meshBasicMaterial color="#ffb800" transparent opacity={0.25} />
      </mesh>
      <mesh ref={ring3} rotation={[0, Math.PI / 4, Math.PI / 6]}>
        <torusGeometry args={[2.55, 0.006, 8, 128]} />
        <meshBasicMaterial color="#ffd54a" transparent opacity={0.18} />
      </mesh>

      <mesh position={[0, -2.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 2.4, 64]} />
        <meshBasicMaterial color="#ffb800" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function HolographicGlobe() {
  return (
    <div className="relative h-full w-full min-h-[280px]">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <GoldParticleSphere />
        </Suspense>
      </Canvas>
      <div
        className="pointer-events-none absolute bottom-[8%] left-1/2 h-24 w-48 -translate-x-1/2"
        style={{
          background: "radial-gradient(ellipse, rgba(255,184,0,0.25), transparent 70%)",
          animation: "empire-pulse-glow 3s ease-in-out infinite",
        }}
      />
    </div>
  );
}
