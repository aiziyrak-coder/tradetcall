import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function GoldParticleSphere() {
  const ref = useRef<THREE.Points>(null);
  const ring = useRef<THREE.Mesh>(null);

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
    if (ring.current) ring.current.rotation.z += delta * 0.15;
  });

  return (
    <group>
      <ambientLight intensity={0.06} />
      <pointLight position={[3, 3, 4]} intensity={0.5} color="#d4a012" />

      <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#e8b923"
          size={0.03}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.72}
        />
      </Points>

      <mesh ref={ring} rotation={[Math.PI / 3.2, 0.2, 0]}>
        <torusGeometry args={[2.05, 0.01, 8, 128]} />
        <meshBasicMaterial color="#c9a020" transparent opacity={0.28} />
      </mesh>

      <mesh position={[0, -1.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2.1, 64]} />
        <meshBasicMaterial color="#a67c00" transparent opacity={0.14} side={THREE.DoubleSide} />
      </mesh>
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
