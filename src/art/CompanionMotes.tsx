import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "../store";
export function CompanionMotes({ puff = false }: { puff?: boolean }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => new Float32Array(18 * 3), []);
  useFrame((s) => {
    if (!points.current) return;
    const t = useWorld.getState().reduced ? 0 : s.clock.elapsedTime;
    const p = points.current.geometry.getAttribute("position");
    for (let i = 0; i < 18; i++) {
      const life = (t * 0.08 + i / 18) % 1,
        a = i * 2.39996 + t * 0.12,
        r = 0.1 + life * 0.22;
      p.setXYZ(i, Math.cos(a) * r, 0.2 + life * 0.4, Math.sin(a) * r);
    }
    p.needsUpdate = true;
  });
  return (
    <points
      ref={points}
      raycast={() => undefined}
      name={puff ? "FloatingSeeds" : "GoldenSpores"}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffe3ac"
        size={puff ? 0.018 : 0.012}
        transparent
        opacity={0.72}
        depthWrite={false}
      />
    </points>
  );
}
