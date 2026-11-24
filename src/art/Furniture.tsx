import { useWorld } from "../store";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { RoundedBox, Line } from "@react-three/drei";
import * as THREE from "three";
import { CHAIR, groundHeight } from "./terrain";
import type { surfaceMaps } from "./materials";
type Maps = ReturnType<typeof surfaceMaps>;
function Wood({
  position = [0, 0, 0],
  size = [1, 1, 1],
  radius = 0.035,
  wood,
  ...props
}: any) {
  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={3}
      position={position}
      castShadow
      receiveShadow
      {...props}
    >
      <meshStandardMaterial
        map={wood?.map}
        normalMap={wood?.normalMap}
        normalScale={new THREE.Vector2(0.2, 0.2)}
        color={wood ? "#ffffff" : "#c9ae88"}
        roughness={0.68}
      />
    </RoundedBox>
  );
}
function Leg({
  x,
  z,
  top = 0.78,
  wood,
}: {
  x: number;
  z: number;
  top?: number;
  wood: Maps;
}) {
  return (
    <mesh position={[x, top / 2, z]} castShadow receiveShadow>
      <cylinderGeometry args={[0.045, 0.062, top, 16]} />
      <meshStandardMaterial map={wood.map} roughness={0.75} />
    </mesh>
  );
}
function Page({ sign }: { sign: number }) {
  const geometry = useMemo(() => {
    const vertices: number[] = [],
      indices: number[] = [];
    const n = 12;
    for (let row = 0; row <= n; row++)
      for (let col = 0; col <= n; col++) {
        const u = col / n,
          v = row / n;
        vertices.push(
          sign * u * 0.275,
          0.018 + Math.sin(u * Math.PI) * 0.032 + u * u * 0.012,
          (v - 0.5) * 0.34,
        );
      }
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const i = r * (n + 1) + c;
        indices.push(i, i + 1, i + n + 2, i, i + n + 2, i + n + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [sign]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#eee3c9"
        roughness={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
function BookInk() {
  const geometry = useMemo(() => {
    const v: number[] = [];
    const height = (u: number) =>
      0.02 + Math.sin(u * Math.PI) * 0.032 + u * u * 0.012;
    for (const side of [-1, 1])
      for (let row = 0; row < 5; row++) {
        const z = -0.11 + row * 0.045;
        for (let i = 0; i < 4; i++) {
          const u = 0.25 + i * 0.14,
            w = u + 0.14;
          v.push(
            side * u * 0.275,
            height(u),
            z,
            side * w * 0.275,
            height(w),
            z,
          );
        }
      }
    v.push(0, 0.02, -0.17, 0, 0.02, 0.17);
    for (let i = 0; i < 3; i++)
      v.push(-0.26, -0.002 + i * 0.008, 0.18, 0.26, -0.002 + i * 0.008, 0.18);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geometry} raycast={() => undefined}>
      <lineBasicMaterial color="#bdb49f" />
    </lineSegments>
  );
}
export function Book({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) useWorld.getState().react("read");
      }}
      name="OpenBook"
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <RoundedBox
        args={[0.57, 0.035, 0.37]}
        radius={0.012}
        smoothness={2}
        position={[0, -0.008, 0]}
        castShadow
      >
        <meshStandardMaterial color="#8b9e94" roughness={0.88} />
      </RoundedBox>
      <Page sign={-1} />
      <Page sign={1} />
      <BookInk />
    </group>
  );
}
export function ReadingStation({ wood }: { wood: Maps }) {
  const { gl } = useThree();
  const lampOn = useWorld((s) => s.lampOn);
  const light = useRef<THREE.PointLight>(null),
    bulb = useRef<THREE.MeshStandardMaterial>(null);
  const brightness = useRef(lampOn ? 1 : 0);
  useFrame((_s, delta) => {
    brightness.current = THREE.MathUtils.damp(
      brightness.current,
      lampOn ? 1 : 0,
      5,
      Math.min(delta, 0.1),
    );
    if (light.current) light.current.intensity = brightness.current * 1.3;
    if (bulb.current) {
      bulb.current.emissiveIntensity = brightness.current * 0.9;
      bulb.current.color
        .set("#b0a28d")
        .lerp(new THREE.Color("#fff1c8"), brightness.current);
    }
  });
  const floor = groundHeight(CHAIR.x, CHAIR.z);
  const stem = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.48, 0.88, 0.08),
        new THREE.Vector3(-0.49, 1.2, 0.08),
        new THREE.Vector3(-0.45, 1.47, 0.08),
        new THREE.Vector3(-0.21, 1.56, 0.08),
        new THREE.Vector3(-0.1, 1.47, 0.08),
      ]),
    [],
  );
  return (
    <group name="ReadingStation" position={[CHAIR.x, floor, CHAIR.z]}>
      <group name="ReadingChair">
        <Wood
          name="Seat"
          wood={wood}
          position={[0, 0.335, CHAIR.seatCenterZ]}
          size={[0.78, 0.09, CHAIR.seatDepth]}
          radius={0.045}
        />
        <Wood
          name="ChairBack"
          wood={wood}
          position={[0, 0.81, CHAIR.backZ]}
          size={[0.74, 0.58, 0.11]}
          radius={0.055}
        />
        {[-0.26, 0.26].flatMap((x) =>
          [CHAIR.rearLegZ, CHAIR.frontLegZ].map((z) => (
            <Leg key={`${x}${z}`} x={x} z={z} top={0.3} wood={wood} />
          )),
        )}
        <Wood
          wood={wood}
          position={[-0.3, 0.57, CHAIR.backZ + 0.06]}
          size={[0.045, 0.6, 0.045]}
          radius={0.02}
        />
        <Wood
          wood={wood}
          position={[0.3, 0.57, CHAIR.backZ + 0.06]}
          size={[0.045, 0.6, 0.045]}
          radius={0.02}
        />
      </group>
      <group name="Desk" position={[0, 0, CHAIR.deskZ]}>
        <Wood
          name="DeskSurface"
          wood={wood}
          position={[0, 0.82, 0]}
          size={[1.45, 0.09, 0.8]}
          radius={0.045}
        />
        {[-0.59, 0.59].flatMap((x) =>
          [-0.28, 0.28].map((z) => (
            <Leg key={`${x}${z}`} x={x} z={z} wood={wood} />
          )),
        )}
        <Book position={[0.08, 0.87, -0.13]} />
        <group
          name="DeskLamp"
          onPointerOver={(e) => {
            e.stopPropagation();
            gl.domElement.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            gl.domElement.style.cursor = "auto";
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta < 6) useWorld.getState().toggleLamp();
          }}
        >
          <mesh name="LampTouchTarget" position={[-0.1, 1.46, 0.08]}>
            <sphereGeometry args={[0.23, 12, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh position={[-0.48, 0.89, 0.08]} castShadow>
            <cylinderGeometry args={[0.14, 0.15, 0.045, 32]} />
            <meshStandardMaterial color="#b9aa94" roughness={0.55} />
          </mesh>
          <mesh castShadow>
            <tubeGeometry args={[stem, 32, 0.022, 10, false]} />
            <meshStandardMaterial color="#a3937e" roughness={0.5} />
          </mesh>
          <group position={[-0.1, 1.46, 0.08]} rotation={[0, 0, 0.18]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.065, 0.18, 0.17, 32, 1, true]} />
              <meshStandardMaterial
                color="#d0c0a8"
                roughness={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, -0.085, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.166, 32]} />
              <meshStandardMaterial
                ref={bulb}
                color={lampOn ? "#fff1c8" : "#b0a28d"}
                emissive="#efd29b"
                emissiveIntensity={lampOn ? 0.8 : 0}
                side={THREE.DoubleSide}
              />
            </mesh>
            <pointLight
              position={[0, -0.12, 0]}
              color="#ffdfae"
              ref={light}
              name="DeskLampLight"
              intensity={lampOn ? 0.9 : 0}
              distance={3}
              decay={2}
            />
          </group>
        </group>
        <mesh position={[0.49, 0.97, 0.08]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.2, 24]} />
          <meshStandardMaterial color="#c8b99c" roughness={0.9} />
        </mesh>
        {[-1, 0, 1].map((side, i) => (
          <mesh
            key={i}
            position={[0.49 + side * 0.023, 1.12, 0.08]}
            rotation={[0, 0, side * 0.09]}
          >
            <cylinderGeometry args={[0.008, 0.008, 0.23, 8]} />
            <meshStandardMaterial
              color={["#a08a68", "#8c9b83", "#c7b48e"][i]}
              roughness={0.85}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
export function RestArea({ cloth }: { cloth: Maps }) {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) useWorld.getState().react("rest");
      }}
      name="RestArea"
      position={[-1.1, groundHeight(-1.1, 0.65), 0.65]}
      rotation={[0, -0.2, 0]}
    >
      <RoundedBox
        args={[1.05, 0.065, 0.7]}
        radius={0.025}
        smoothness={3}
        position={[0, 0.033, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          map={cloth.map}
          normalMap={cloth.normalMap}
          roughness={1}
        />
      </RoundedBox>
      <RoundedBox
        args={[0.38, 0.12, 0.28]}
        radius={0.055}
        smoothness={4}
        position={[-0.22, 0.11, -0.15]}
        castShadow
      >
        <meshStandardMaterial color="#c9beab" roughness={1} />
      </RoundedBox>
      <Line
        points={[
          [-0.47, 0.068, 0.28],
          [0.47, 0.068, 0.28],
        ]}
        color="#918b7a"
        lineWidth={0.7}
      />
    </group>
  );
}
