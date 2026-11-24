import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { groundHeight, mossAllowed, noise3 } from "./terrain";
/** Batched bent blades grow from the same habitat mask as the moss cushions. */
export function Grass() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.CapsuleGeometry(0.035, 0.055, 2, 6);
    g.translate(0, 0.055, 0);
    return g;
  }, []);
  const blades = useMemo(() => {
    const list: { x: number; z: number; s: number }[] = [];
    for (let i = 0; list.length < 350 && i < 22000; i++) {
      const centers = [
        [-2.7, -1.8],
        [2.1, -2.5],
        [-2.5, 0.8],
        [1.4, 1.9],
        [0.1, 3.2],
      ];
      const [cx, cz] = centers[i % centers.length];
      const angle = i * 2.399963,
        r = 0.7 * Math.sqrt(noise3(i * 0.37, 8, 0)),
        x = cx + Math.cos(angle) * r,
        z = cz + Math.sin(angle) * r;
      if (mossAllowed(x, z))
        list.push({ x, z, s: 0.55 + noise3(i, 9, 3) * 0.75 });
    }
    return list;
  }, []);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D(),
      color = new THREE.Color();
    blades.forEach((p, i) => {
      dummy.position.set(p.x, groundHeight(p.x, p.z) + 0.022, p.z);
      dummy.rotation.set(0.1 * Math.sin(i), i * 1.73, 0.15 * Math.cos(i));
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
      color.set(["#7f9169", "#8c9b76", "#9caa82"][i % 3]);
      ref.current!.setColorAt(i, color);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [blades]);
  return (
    <instancedMesh
      name="GrassBlades"
      ref={ref}
      args={[geometry, undefined, blades.length]}
      receiveShadow
    >
      <meshStandardMaterial side={THREE.DoubleSide} roughness={0.95} />
    </instancedMesh>
  );
}
