import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { companionFor, type CompanionId } from "../companions";
function Stem({
  points,
  color,
  radius = 0.018,
}: {
  points: [number, number, number][];
  color: string;
  radius?: number;
}) {
  const geometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        16,
        radius,
        7,
        false,
      ),
    [points, radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}
function Leaf({
  x = 0,
  y = 0,
  z = 0,
  angle = 0,
  color,
}: {
  x?: number;
  y?: number;
  z?: number;
  angle?: number;
  color: string;
}) {
  return (
    <mesh
      position={[x, y, z]}
      rotation={[0.12, 0, angle]}
      scale={[0.065, 0.16, 0.035]}
    >
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial color={color} roughness={0.52} />
    </mesh>
  );
}
export function CompanionCrown({ id }: { id: CompanionId }) {
  const c = companionFor(id);
  const star = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 + Math.PI / 2,
        r = i % 2 ? 0.075 : 0.14;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }, []);
  const rays = useMemo(() => {
    const a = [];
    for (let i = 0; i < 52; i++) {
      const y = 1 - (2 * (i + 0.5)) / 52,
        r = Math.sqrt(1 - y * y),
        t = i * 2.39996;
      a.push(
        0,
        0.29,
        0,
        0.15 * r * Math.cos(t),
        0.29 + 0.15 * y,
        0.15 * r * Math.sin(t),
      );
    }
    return new Float32Array(a);
  }, []);
  return (
    <group name={`Crown-${id}`} position={[0, 0.94, 0]}>
      {c.head === "star" && (
        <>
          <Stem
            color="#83965b"
            points={[
              [0, 0, 0],
              [0, 0.18, 0],
              [0.08, 0.34, 0],
            ]}
          />
          <Leaf x={-0.07} y={0.13} angle={0.9} color="#91a669" />
          <Leaf x={0.08} y={0.16} angle={-0.9} color="#91a669" />
          <mesh position={[0.08, 0.4, 0]}>
            <extrudeGeometry
              args={[
                star,
                {
                  depth: 0.045,
                  bevelEnabled: true,
                  bevelSize: 0.02,
                  bevelThickness: 0.02,
                  bevelSegments: 3,
                  steps: 1,
                },
              ]}
            />
            <meshStandardMaterial
              color={c.accent}
              emissive={c.accent}
              emissiveIntensity={0.3}
            />
          </mesh>
        </>
      )}
      {c.head === "fern" &&
        [-1, 0, 1].map((branch) => (
          <group key={branch} rotation={[0, branch * 0.3, -branch * 0.55]}>
            <Stem
              color={c.accent}
              points={[
                [0, 0, 0],
                [0, 0.24, 0],
                [0.025, 0.49, 0],
              ]}
            />
            {Array.from({ length: 6 }, (_, i) =>
              [-1, 1].map((side) => (
                <mesh
                  key={`${i}-${side}`}
                  position={[side * (0.058 - i * 0.005), 0.07 + i * 0.065, 0]}
                  rotation={[0, 0, -side * 0.9]}
                  scale={[0.035, 0.078 - i * 0.005, 0.018]}
                >
                  <sphereGeometry args={[1, 12, 8]} />
                  <meshStandardMaterial color={c.accent} roughness={0.7} />
                </mesh>
              )),
            )}
          </group>
        ))}
      {c.head === "mushroom" &&
        [-1, 0, 1].map((n) => (
          <group
            key={n}
            position={[n * 0.17, 0, 0]}
            rotation={[0, 0, -n * 0.22]}
          >
            <Stem
              color="#e8d8af"
              points={[
                [0, 0, 0],
                [0, n === 0 ? 0.24 : 0.12, 0],
              ]}
              radius={0.027}
            />
            <mesh
              position={[0, n === 0 ? 0.23 : 0.11, 0]}
              scale={n === 0 ? 1 : 0.75}
            >
              <latheGeometry
                args={[
                  [
                    [0, -0.015],
                    [0.085, -0.015],
                    [0.13, 0],
                    [0.12, 0.04],
                    [0.09, 0.095],
                    [0.04, 0.12],
                    [0, 0.125],
                  ].map(([x, y]) => new THREE.Vector2(x, y)),
                  24,
                ]}
              />
              <meshStandardMaterial color={c.accent} roughness={0.58} />
            </mesh>
          </group>
        ))}
      {(c.head === "leaves" || c.head === "drop") && (
        <>
          <Stem
            color={c.accent}
            points={[
              [0, 0, 0],
              [0.02, 0.1, 0],
              [0.05, 0.19, 0],
            ]}
          />
          <Leaf x={0.085} y={0.2} angle={-0.7} color={c.accent} />
          {c.head === "leaves" && (
            <Leaf x={-0.085} y={0.2} angle={0.7} color="#b2b6e8" />
          )}
        </>
      )}
      {c.head === "flower" && (
        <>
          <group position={[0, 0.07, 0]}>
            {Array.from({ length: 5 }, (_, i) => (
              <mesh
                key={i}
                position={[
                  Math.sin(i * 1.256) * 0.065,
                  0.105,
                  Math.cos(i * 1.256) * 0.065,
                ]}
                rotation={[
                  Math.cos(i * 1.256) * 0.28,
                  0,
                  -Math.sin(i * 1.256) * 0.28,
                ]}
                scale={[0.075, 0.17, 0.065]}
              >
                <sphereGeometry args={[1, 18, 12]} />
                <meshStandardMaterial
                  color={i % 2 ? c.accent : "#dba4ba"}
                  roughness={0.48}
                />
              </mesh>
            ))}
          </group>
          <Leaf x={-0.08} y={0.025} angle={1.1} color="#91a377" />
          <Leaf x={0.08} y={0.025} angle={-1.1} color="#91a377" />
        </>
      )}
      {c.head === "horns" &&
        [-1, 1].map((side) => (
          <Stem
            key={side}
            color={c.accent}
            radius={0.035}
            points={[
              [side * 0.19, -0.015, 0],
              [side * 0.22, 0.1, 0],
              [side * 0.13, 0.19, 0],
              [side * 0.16, 0.27, 0],
              [side * 0.2, 0.3, 0],
            ]}
          />
        ))}
      {c.head === "puff" && (
        <>
          <Stem
            color="#bba37c"
            points={[
              [0, 0, 0],
              [0, 0.18, 0],
              [0, 0.29, 0],
            ]}
            radius={0.012}
          />
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[rays, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color={c.accent} />
          </lineSegments>
          <mesh position={[0, 0.29, 0]}>
            <sphereGeometry args={[0.065, 16, 12]} />
            <meshStandardMaterial color={c.accent} />
          </mesh>
        </>
      )}
    </group>
  );
}
