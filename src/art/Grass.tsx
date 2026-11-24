import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { groundHeight, mossAllowed, noise3 } from "./terrain";
/** Batched bent blades grow from the same habitat mask as the moss cushions. */
export function Grass() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          -0.012, 0, 0, 0.012, 0, 0, -0.008, 0.055, 0.008, 0.008, 0.055, 0.008,
          0, 0.11, 0.028,
        ],
        3,
      ),
    );
    g.setIndex([0, 1, 3, 0, 3, 2, 2, 3, 4]);
    g.computeVertexNormals();
    return g;
  }, []);
  const blades = useMemo(() => {
    const list: { x: number; z: number; s: number }[] = [];
    for (let i = 0; list.length < 1100 && i < 16000; i++) {
      const angle = i * 2.399963,
        r = 1.2 + noise3(i * 0.37, 8, 0) * 1.2,
        x = Math.cos(angle) * r,
        z = Math.sin(angle) * r;
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
