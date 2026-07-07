import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function GoldParticleSphere() {
  const ref = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const n = 2200;
    const arr = new Float32Array(n * 3);
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const rad = 1.65;
      arr[i * 3] = Math.cos(theta) * r * rad;
      arr[i * 3 + 1] = y * rad;
      arr[i * 3 + 2] = Math.sin(theta) * r * rad;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.1;
  });

  return (
    <group>
      <ambientLight intensity={0.04} />
      <pointLight position={[3, 3, 4]} intensity={0.35} color="#c9a020" />

      <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#c9a020"
          size={0.028}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.65}
        />
      </Points>
    </group>
  );
}

export function HolographicGlobe() {
  return (
    <div className="empire-globe">
      <Canvas camera={{ position: [0, 0, 5.2], fov: 40 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <GoldParticleSphere />
        </Suspense>
      </Canvas>
    </div>
  );
}
