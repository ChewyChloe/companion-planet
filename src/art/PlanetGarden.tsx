import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useWorld } from "../store";
import { planetFor } from "../planets";
import { groundHeight, groundNormal, noise3 } from "./terrain";
function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  const crown = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 32, 20),
      p = g.getAttribute("position"),
      colors = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        r = 1 + (noise3(x * 3, y * 3, z * 3) - 0.5) * 0.18;
      p.setXYZ(i, x * r * 0.62, y * r * 0.56, z * r * 0.55);
      const color = new THREE.Color("#9fae91").lerp(
        new THREE.Color("#b9bda0"),
        noise3(x * 6, y * 6, z * 6) * 0.4,
      );
      colors.push(color.r, color.g, color.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => crown.dispose(), [crown]);
  return (
    <group
      position={[x, groundHeight(x, z), z]}
      scale={scale}
      name="LittleTree"
    >
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.09, 1, 12]} />
        <meshStandardMaterial color="#95836e" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.18, 0]} geometry={crown} castShadow>
        <meshStandardMaterial vertexColors roughness={0.92} />
      </mesh>
    </group>
  );
}
export function PlanetGarden() {
  const id = useWorld((s) => s.planetId),
    bloom = useWorld((s) => s.flowersBloom);
  const theme = planetFor(id);
  const flowers = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = i * 2.39996,
          r = 2.4 + (i % 3) * 0.52,
          x = Math.cos(a) * r,
          z = Math.sin(a) * r;
        return {
          x,
          z,
          q: new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            groundNormal(x, z),
          ),
        };
      }),
    [],
  );
  return (
    <group name={`Garden-${id}`}>
      <Tree x={-2.8} z={-1.65} scale={id === "forest" ? 1.15 : 0.9} />
      <Tree x={2.3} z={-2.5} scale={0.72} />
      {id === "forest" && (
        <>
          <Tree x={-3.3} z={1} scale={0.75} />
          <Tree x={0.2} z={-3.6} scale={0.9} />
        </>
      )}
      {flowers.map(({ x, z, q }, i) => (
        <group
          key={i}
          name="InteractiveFlower"
          position={[x, groundHeight(x, z), z]}
          quaternion={q}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta < 6) useWorld.getState().toggleFlowers();
          }}
        >
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.012, 0.018, 0.32, 6]} />
            <meshStandardMaterial color="#839b76" />
          </mesh>
          <group position={[0, 0.35, 0]} scale={bloom ? 1.4 : 0.72}>
            {Array.from({ length: 5 }, (_, j) => (
              <mesh
                key={j}
                position={[
                  Math.cos(j * 1.256) * 0.07,
                  0,
                  Math.sin(j * 1.256) * 0.07,
                ]}
                rotation={[0, j * 1.256, 0.4]}
                scale={[0.065, 0.04, 0.1]}
              >
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial
                  color={
                    id === "rose" ? "#dba1af" : i % 2 ? "#ddd3af" : "#b9b0cc"
                  }
                  roughness={0.8}
                />
              </mesh>
            ))}
            <mesh>
              <sphereGeometry args={[0.04, 10, 8]} />
              <meshStandardMaterial color="#ecd6a4" />
            </mesh>
          </group>
        </group>
      ))}
      {theme.landmark === "arch" && (
        <mesh
          position={[-2.4, groundHeight(-2.4, -1) + 0.6, -1]}
          rotation={[0, 0.35, 0]}
          castShadow
        >
          <torusGeometry args={[0.65, 0.16, 12, 36, Math.PI]} />
          <meshStandardMaterial color="#c3bfce" roughness={0.96} />
        </mesh>
      )}
      {(theme.landmark === "books" || theme.landmark === "arch") && (
        <group
          position={[-2.5, groundHeight(-2.5, 0.8) + 0.13, 0.8]}
          rotation={[0, -0.35, 0]}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta < 6) useWorld.getState().react("read");
          }}
          name="GiantBook"
        >
          <RoundedBox
            args={[1.25, 0.24, 0.85]}
            radius={0.04}
            smoothness={2}
            castShadow
          >
            <meshStandardMaterial color="#b0a7ba" roughness={0.85} />
          </RoundedBox>
          <RoundedBox
            args={[1.21, 0.16, 0.81]}
            position={[0.025, 0.01, 0]}
            radius={0.02}
            smoothness={2}
          >
            <meshStandardMaterial color="#e4d6b9" roughness={1} />
          </RoundedBox>
        </group>
      )}
    </group>
  );
}
