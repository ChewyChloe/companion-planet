import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Line, Stats, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useWorld } from "./store";
import { type Action } from "./domain";
import { advanceBehavior, initialBehavior } from "./behavior";
const height = (x: number, z: number) =>
  Math.sqrt(Math.max(0, 2.8 ** 2 - x * x - z * z)) * 0.58 - 1.424;
function Ball({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  color = "#b1ced4",
  roughness = 0.8,
  ...props
}: any) {
  return (
    <mesh position={position} scale={scale} castShadow receiveShadow {...props}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}
function Box({
  position = [0, 0, 0],
  size = [1, 1, 1],
  color = "#b9a78d",
  ...props
}: any) {
  return (
    <mesh position={position} castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Leaf({ color = "#8b9a76", ...props }: any) {
  const shape = useMemo(() => {
    const leaf = new THREE.Shape();
    leaf.moveTo(0, 0);
    leaf.bezierCurveTo(-0.2, 0.12, -0.22, 0.42, 0, 0.62);
    leaf.bezierCurveTo(0.22, 0.42, 0.2, 0.12, 0, 0);
    return leaf;
  }, []);
  return (
    <group {...props}>
      <mesh>
        <shapeGeometry args={[shape, 12]} />
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          roughness={1}
        />
      </mesh>
      <Line
        points={[
          [0, 0.04, 0.006],
          [0, 0.5, 0.006],
        ]}
        color="#64705c"
        lineWidth={0.65}
      />
    </group>
  );
}
function Tree({ x, z, size = 1 }: { x: number; z: number; size?: number }) {
  return (
    <group position={[x, height(x, z), z]} scale={size}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.028, 0.048, 0.9, 8]} />
        <meshStandardMaterial color="#9d896d" roughness={1} />
      </mesh>
      {[-1, -0.5, 0, 0.5, 1].map((side, i) => (
        <Leaf
          key={i}
          position={[side * 0.05, 0.6 - Math.abs(side) * 0.14, 0]}
          rotation={[0.1, side * 0.3, -side * 0.7]}
          scale={0.85 + Math.abs(side) * 0.15}
          color={i % 2 ? "#a7b58e" : "#849a7a"}
        />
      ))}
    </group>
  );
}
function FlowerPatch({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, height(x, z), z]}>
      {[
        [-0.12, 0],
        [0.08, 0.1],
        [0.18, -0.06],
      ].map(([a, b], i) => (
        <group key={i} position={[a, 0, b]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.007, 0.01, 0.24, 5]} />
            <meshStandardMaterial color="#89936a" />
          </mesh>
          <group position={[0, 0.24, 0]}>
            {Array.from({ length: 5 }, (_, j) => (
              <Ball
                key={j}
                position={[
                  Math.cos(j * Math.PI * 0.4) * 0.055,
                  Math.sin(j * Math.PI * 0.4) * 0.055,
                  0,
                ]}
                scale={[0.043, 0.05, 0.018]}
                color={i % 2 ? "#ead5a2" : "#d7b0a0"}
              />
            ))}
            <Ball scale={[0.026, 0.026, 0.025]} color="#b8935d" />
          </group>
        </group>
      ))}
    </group>
  );
}
function OrbitBand({ theta }: { theta: number }) {
  const points = useMemo(
    () =>
      Array.from({ length: 97 }, (_, i) => {
        const angle = (i / 96) * Math.PI * 2;
        return [
          2.81 * Math.sin(theta) * Math.cos(angle),
          1.63 * Math.cos(theta) - 1.424,
          2.81 * Math.sin(theta) * Math.sin(angle),
        ] as [number, number, number];
      }),
    [theta],
  );
  return <Line points={points} color="#aba58d" lineWidth={0.65} />;
}
function SurfacePatch({
  x,
  z,
  rx,
  rz,
  color,
  lift = 0.02,
}: {
  x: number;
  z: number;
  rx: number;
  rz: number;
  color: string;
  lift?: number;
}) {
  const geometry = useMemo(() => {
    const vertices = [x, height(x, z) + lift, z];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const wobble = 1 + Math.sin(a * 3) * 0.06;
      const px = x + Math.cos(a) * rx * wobble,
        pz = z + Math.sin(a) * rz * wobble;
      vertices.push(px, height(px, pz) + lift, pz);
    }
    const indices = [];
    for (let i = 1; i <= 48; i++) indices.push(0, i + 1, i);
    const mesh = new THREE.BufferGeometry();
    mesh.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    mesh.setIndex(indices);
    mesh.computeVertexNormals();
    return mesh;
  }, [x, z, rx, rz, lift]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}
function Planet() {
  return (
    <group>
      <mesh position={[0, -1.424, 0]} scale={[2.8, 1.624, 2.8]}>
        <sphereGeometry args={[1, 64, 40]} />
        <meshStandardMaterial color="#ded7bf" roughness={1} />
      </mesh>
      <mesh position={[0, -1.424, 0]} scale={[2.806, 1.628, 2.806]}>
        <sphereGeometry args={[1, 64, 24, 0, Math.PI * 2, 0, 1.13]} />
        <meshStandardMaterial color="#b8c6a4" roughness={1} />
      </mesh>
      <OrbitBand theta={1.13} />
      <OrbitBand theta={1.62} />
      <OrbitBand theta={2.15} />
      <SurfacePatch
        x={0.65}
        z={1.75}
        rx={0.52}
        rz={0.34}
        color="#d3cdb3"
        lift={0.012}
      />
      <SurfacePatch
        x={0.65}
        z={1.75}
        rx={0.47}
        rz={0.29}
        color="#9cb5b6"
        lift={0.022}
      />
      <Line
        points={[
          [0.45, height(0.45, 1.72) + 0.028, 1.72],
          [0.6, height(0.6, 1.7) + 0.028, 1.7],
          [0.77, height(0.77, 1.72) + 0.028, 1.72],
        ]}
        color="#dbe3d8"
        lineWidth={0.8}
      />
      {[
        [-0.08, 1.65],
        [0.1, 1.96],
        [1.17, 1.75],
      ].map(([x, z], i) => (
        <Ball
          key={`shore${i}`}
          position={[x, height(x, z) + 0.02, z]}
          scale={[0.08, 0.04, 0.065]}
          color="#c4c6b4"
        />
      ))}
      <Leaf
        position={[1.05, height(1.05, 1.6), 1.6]}
        scale={0.4}
        rotation={[0.1, 0.5, -0.1]}
      />
      <Leaf
        position={[1.06, height(1.06, 1.65), 1.65]}
        scale={0.32}
        rotation={[0, -0.4, -0.5]}
      />

      <group position={[0.72, height(0.72, -0.5), -0.5]}>
        <Box position={[0, 0.5, 0]} size={[1.05, 0.07, 0.62]} color="#c3a17b" />
        {[-0.42, 0.42].flatMap((x) =>
          [-0.24, 0.24].map((z) => (
            <Box
              key={`${x}${z}`}
              position={[x, 0.25, z]}
              size={[0.045, 0.5, 0.045]}
              color="#a68b6a"
            />
          )),
        )}
        <Box
          position={[-0.15, 0.552, -0.02]}
          size={[0.44, 0.035, 0.28]}
          color="#eee6cf"
        />
        <Box
          position={[-0.15, 0.574, -0.02]}
          size={[0.009, 0.008, 0.28]}
          color="#b7aa8b"
        />
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            position={[0.28, 0.555 + i * 0.035, -0.16]}
            size={[0.2, 0.032, 0.17]}
            rotation={[0, i * 0.1, 0]}
            color={["#9caaa0", "#c3a89a", "#dbceac"][i]}
          />
        ))}
        <mesh position={[0.35, 0.6, 0.12]}>
          <cylinderGeometry args={[0.055, 0.043, 0.13, 12]} />
          <meshStandardMaterial color="#eee9da" roughness={1} />
        </mesh>
        <mesh position={[0.36, 0.71, 0.12]} rotation={[0, 0, -0.15]}>
          <cylinderGeometry args={[0.008, 0.008, 0.16, 6]} />
          <meshStandardMaterial color="#6f8579" />
        </mesh>
        <mesh position={[0, 0.19, 0.69]}>
          <cylinderGeometry args={[0.245, 0.22, 0.07, 24]} />
          <meshStandardMaterial color="#b9936c" roughness={1} />
        </mesh>
        {[-0.15, 0.15].flatMap((x) =>
          [0.54, 0.81].map((z) => (
            <Box
              key={`${x}${z}`}
              position={[x, 0.08, z]}
              size={[0.04, 0.18, 0.04]}
              color="#a68b6a"
            />
          )),
        )}
      </group>
      <Tree x={-1.5} z={-0.8} size={1.15} />
      <Tree x={-0.8} z={-1.55} size={0.8} />
      <Tree x={1.6} z={-0.7} size={0.72} />
      <group
        position={[-1.15, height(-1.15, 0.6), 0.6]}
        rotation={[0, -0.3, 0]}
      >
        <Box
          position={[0, 0.025, 0]}
          size={[0.8, 0.04, 0.55]}
          color="#cbb6a2"
        />
        <Box
          position={[0.1, 0.09, -0.1]}
          size={[0.3, 0.09, 0.22]}
          color="#ece1c7"
        />
        {[-0.3, -0.15, 0, 0.15, 0.3].map((x) => (
          <Box
            key={x}
            position={[x, 0.05, 0.05]}
            size={[0.006, 0.004, 0.4]}
            color="#a99e85"
          />
        ))}
      </group>
      {Array.from({ length: 7 }, (_, i) => {
        const x = 0.1 + Math.sin(i * 0.5) * 0.2,
          z = 0.3 + i * 0.17;
        return (
          <group
            key={i}
            position={[x, height(x, z) + 0.015, z]}
            rotation={[0, i * 0.65, 0]}
          >
            <Box
              size={[0.24, 0.018, 0.16]}
              color={i % 2 ? "#e4dcc7" : "#d1ccb4"}
            />
          </group>
        );
      })}
      <FlowerPatch x={-1.7} z={0.05} />
      <FlowerPatch x={1.35} z={0.65} />
      <FlowerPatch x={-0.5} z={1.3} />
      <group position={[1.55, height(1.55, 0.1), 0.1]}>
        <Box
          position={[0, 0.22, 0]}
          size={[0.035, 0.45, 0.035]}
          color="#9f8a69"
        />
        <Box
          position={[0, 0.47, 0]}
          size={[0.33, 0.19, 0.04]}
          color="#d9c99f"
        />
        <Box
          position={[0, 0.48, 0.024]}
          size={[0.2, 0.008, 0.004]}
          color="#958b71"
        />
        <Box
          position={[-0.025, 0.44, 0.024]}
          size={[0.15, 0.008, 0.004]}
          color="#958b71"
        />
      </group>
      <group position={[-0.15, height(-0.15, -1.35), -1.35]}>
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.14, 0.1, 0.26, 12]} />
          <meshStandardMaterial color="#c0a48a" roughness={1} />
        </mesh>
        <Leaf position={[0, 0.25, 0]} scale={0.55} />
        <Leaf position={[0, 0.25, 0]} scale={0.4} rotation={[0, 0.6, -0.7]} />
      </group>
    </group>
  );
}
function ExternalModel({ url }: { url: string }) {
  const gltf = useGLTF(url);
  const clone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return <primitive object={clone} scale={0.65} />;
}
/** Asset slot: supply a normalized, feet-at-origin GLB without replacing the controller. */
function Creature({
  action,
  time,
  modelUrl,
}: {
  action: Action;
  time: React.RefObject<number>;
  modelUrl?: string;
}) {
  const { gl } = useThree();
  const bodyProfile = useMemo(
    () =>
      new THREE.SplineCurve([
        new THREE.Vector2(0, 0.015),
        new THREE.Vector2(0.18, 0.035),
        new THREE.Vector2(0.3, 0.13),
        new THREE.Vector2(0.37, 0.3),
        new THREE.Vector2(0.36, 0.48),
        new THREE.Vector2(0.29, 0.66),
        new THREE.Vector2(0.16, 0.78),
        new THREE.Vector2(0, 0.81),
      ]).getPoints(40),
    [],
  );
  const body = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = time.current;
    if (!body.current || !eyes.current || !left.current || !right.current)
      return;
    const moving =
      action === "walk" || action === "approach" || action === "return";
    const sleeping = action === "rest";
    const breathing = 1 + Math.sin(t * 2) * 0.022;
    body.current.scale.set(1, sleeping ? 0.78 : breathing, 1);
    body.current.position.y =
      action === "happy"
        ? Math.abs(Math.sin(t * 5)) * 0.22
        : moving
          ? Math.abs(Math.sin(t * 7)) * 0.045
          : 0;
    body.current.rotation.z =
      action === "listen"
        ? Math.sin(t * 2) * 0.09
        : moving
          ? Math.sin(t * 7) * 0.04
          : 0;
    body.current.rotation.x = action === "read" ? 0.16 : sleeping ? 0.12 : 0;
    const blink = t % 6.4 > 6.24 || sleeping;
    eyes.current.scale.y = blink ? 0.08 : 1;
    left.current.rotation.z =
      action === "stretch"
        ? -1.4
        : action === "happy"
          ? -1
          : action === "read"
            ? -0.5
            : moving
              ? Math.sin(t * 7) * 0.3
              : 0;
    gl.domElement.dataset.pose = [
      body.current.scale.y,
      body.current.position.y,
      body.current.rotation.z,
      eyes.current.scale.y,
    ]
      .map((n) => n.toFixed(4))
      .join(",");
    right.current.rotation.z =
      action === "stretch"
        ? 1.4
        : action === "happy"
          ? 1
          : action === "read"
            ? 0.5
            : moving
              ? -Math.sin(t * 7) * 0.3
              : 0;
  });
  return (
    <group ref={body}>
      {modelUrl ? (
        <Suspense fallback={null}>
          <ExternalModel url={modelUrl} />
        </Suspense>
      ) : (
        <>
          <mesh scale={[1, 1, 0.87]}>
            <latheGeometry args={[bodyProfile, 48]} />
            <meshStandardMaterial color="#9dbdc4" roughness={1} />
          </mesh>
          <Ball
            position={[-0.16, 0.055, 0.11]}
            scale={[0.12, 0.055, 0.14]}
            color="#89a6af"
          />
          <Ball
            position={[0.16, 0.055, 0.11]}
            scale={[0.12, 0.055, 0.14]}
            color="#89a6af"
          />
          <Ball
            position={[0, 0.25, 0.315]}
            scale={[0.16, 0.13, 0.018]}
            color="#d2dfd9"
          />
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[side * 0.15, 0.74, 0]}
              rotation={[0, 0, -side * 0.27]}
            >
              <mesh position={[0, 0.085, 0]}>
                <capsuleGeometry args={[0.022, 0.14, 4, 8]} />
                <meshStandardMaterial color="#8daab1" roughness={1} />
              </mesh>
              <Ball
                position={[0, 0.185, 0]}
                scale={[0.045, 0.065, 0.025]}
                color="#b8c2a0"
              />
            </group>
          ))}
          <group ref={eyes} position={[0, 0.48, 0.315]}>
            {[-1, 1].map((s) => (
              <group key={s}>
                <Ball
                  position={[s * 0.105, 0, 0.005]}
                  scale={[0.026, 0.042, 0.02]}
                  color="#394a4e"
                />
                <Ball
                  position={[s * 0.108, 0.014, 0.022]}
                  scale={[0.008, 0.009, 0.005]}
                  color="#fff9e9"
                />
              </group>
            ))}
          </group>
          <Ball
            position={[-0.2, 0.39, 0.293]}
            scale={[0.049, 0.022, 0.018]}
            color="#d0b2a4"
          />
          <Ball
            position={[0.2, 0.39, 0.293]}
            scale={[0.049, 0.022, 0.018]}
            color="#d0b2a4"
          />
          <mesh position={[0, 0.395, 0.326]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.028, 0.006, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#596f72" />
          </mesh>
          <group ref={left} position={[-0.3, 0.38, 0]}>
            <Ball
              position={[-0.05, -0.07, 0.025]}
              scale={[0.085, 0.16, 0.075]}
              color="#93b1b9"
            />
          </group>
          <group ref={right} position={[0.3, 0.38, 0]}>
            <Ball
              position={[0.05, -0.07, 0.025]}
              scale={[0.085, 0.16, 0.075]}
              color="#93b1b9"
            />
          </group>
          {action === "read" && (
            <group position={[0, 0.28, 0.4]} rotation={[-0.55, 0, 0]}>
              <Box
                position={[-0.09, 0, 0]}
                size={[0.18, 0.025, 0.25]}
                color="#f3ead5"
                rotation={[0, 0, -0.08]}
              />
              <Box
                position={[0.09, 0, 0]}
                size={[0.18, 0.025, 0.25]}
                color="#e9dec6"
                rotation={[0, 0, 0.08]}
              />
              <Box
                position={[0, 0.005, 0]}
                size={[0.012, 0.035, 0.26]}
                color="#9baf9a"
              />
            </group>
          )}
        </>
      )}
      {modelUrl && (
        <>
          <group ref={eyes} />
          <group ref={left} />
          <group ref={right} />
        </>
      )}
    </group>
  );
}
function Character({ pet, onClick }: { pet: boolean; onClick: () => void }) {
  const root = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const action = useRef<Action>("idle");
  const target = useRef(new THREE.Vector3(-0.4, 0, 0.5));
  const position = useRef(new THREE.Vector3(-0.4, 0, 0.5));
  const behavior = useRef({ ...initialBehavior, until: 8 });
  const rendered = useRef<Action>("idle");
  const [visual, setVisual] = ReactUseState<Action>("idle");
  const { gl, camera } = useThree();
  const normal = useMemo(() => new THREE.Vector3(), []);
  const screen = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const frames = useRef(0);
  useFrame((_state, delta) => {
    const state = useWorld.getState();
    const dt = Math.min(delta, 0.05);
    clock.current += state.reduced ? dt * 0.18 : dt;
    behavior.current = advanceBehavior(
      behavior.current,
      state.timer.phase,
      state.reaction,
      state.reactionUntil,
      Date.now(),
      _state.clock.elapsedTime,
    );
    action.current = behavior.current.action;
    target.current.set(
      behavior.current.target[0],
      0,
      behavior.current.target[1],
    );
    const distance = position.current.distanceTo(target.current);
    position.current.lerp(target.current, 1 - Math.exp(-dt * 0.95));
    const actual =
      distance > 0.07 && !pet
        ? action.current === "approach"
          ? "approach"
          : action.current === "return"
            ? "return"
            : "walk"
        : action.current === "walk" || action.current === "return"
          ? "idle"
          : action.current;
    if (actual !== rendered.current) {
      rendered.current = actual;
      setVisual(actual);
    }
    if (root.current) {
      if (pet) {
        root.current.position.set(0, -0.4, 0);
        root.current.quaternion.identity();
      } else {
        const surface = height(position.current.x, position.current.z);
        root.current.position.set(
          position.current.x,
          THREE.MathUtils.damp(
            root.current.position.y,
            surface + (actual === "read" && distance < 0.07 ? 0.16 : 0),
            5,
            dt,
          ),
          position.current.z,
        );
        normal
          .set(
            position.current.x,
            (surface + 1.424) / (0.58 * 0.58),
            position.current.z,
          )
          .normalize();
        root.current.quaternion.setFromUnitVectors(up, normal);
      }
    }
    if (model.current) {
      const angle = pet
        ? 0
        : state.timer.phase === "focus" && distance < 0.08
          ? 0.35
          : distance > 0.07
            ? Math.atan2(
                target.current.x - position.current.x,
                target.current.z - position.current.z,
              )
            : 0.35;
      const difference = Math.atan2(
        Math.sin(angle - model.current.rotation.y),
        Math.cos(angle - model.current.rotation.y),
      );
      model.current.rotation.y += difference * (1 - Math.exp(-dt * 4));
    }
    if (++frames.current % 15 === 0) {
      gl.domElement.dataset.action = actual;
      gl.domElement.dataset.reaction = state.reaction || "none";
      gl.domElement.dataset.frames = String(frames.current);
      gl.domElement.dataset.camera = camera.position
        .toArray()
        .map((x) => x.toFixed(2))
        .join(",");
      if (root.current) {
        screen.copy(root.current.position);
        screen.y += 0.45;
        screen.project(camera);
        gl.domElement.dataset.screen = [
          (screen.x + 1) / 2,
          (1 - screen.y) / 2,
        ].join(",");
      }
      gl.domElement.dataset.position = position.current
        .toArray()
        .map((x) => x.toFixed(3))
        .join(",");
    }
  });
  return (
    <group
      ref={root}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <group ref={model} scale={1.32}>
        <Creature
          action={visual}
          time={clock}
          modelUrl={import.meta.env.VITE_CHARACTER_MODEL_URL}
        />
      </group>
    </group>
  );
}
import { useState as ReactUseState } from "react";
class SceneBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-error" role="alert">
        3D 畫面無法啟動。請開啟硬體加速並重新整理；計時與聊天仍可使用。
      </div>
    ) : (
      this.props.children
    );
  }
}
function RendererHealth({ onLost }: { onLost: (lost: boolean) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault();
      onLost(true);
    };
    const restored = () => onLost(false);
    gl.domElement.addEventListener("webglcontextlost", lost);
    gl.domElement.addEventListener("webglcontextrestored", restored);
    return () => {
      gl.domElement.removeEventListener("webglcontextlost", lost);
      gl.domElement.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl, onLost]);
  return null;
}
function CameraFraming({ pet }: { pet: boolean }) {
  const { camera, size } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = pet ? 30 : size.width < 500 ? 36 : 42;
      if (pet) camera.lookAt(0, 0.3, 0);
      camera.updateProjectionMatrix();
    }
  }, [camera, pet, size.width]);
  return null;
}
export default function Scene({
  pet,
  onClick,
  reduced,
}: {
  pet: boolean;
  onClick: () => void;
  reduced: boolean;
}) {
  const [lost, setLost] = ReactUseState(false);
  return (
    <SceneBoundary>
      <Canvas
        fallback={
          <div className="scene-error" role="alert">
            裝置無法使用 WebGL，請開啟硬體加速或更換瀏覽器。
          </div>
        }
        key={pet ? "pet" : "planet"}
        dpr={[1, 1.7]}
        camera={{
          position: pet ? [0, 0.45, 3.5] : [6, 5.6, 9.6],
          fov: pet ? 30 : 42,
        }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#f4f1e8", 0);
          gl.domElement.setAttribute(
            "aria-label",
            pet ? "星雲仔桌寵" : "可拖曳旋轉的 3D 星球",
          );
        }}
      >
        <CameraFraming pet={pet} />
        <RendererHealth onLost={setLost} />
        <ambientLight intensity={1.9} />
        <hemisphereLight args={["#fff9ed", "#a4ae98", 0.6]} />
        <directionalLight position={[-3, 7, 5]} intensity={0.75} />
        {!pet && (
          <>
            <Planet />
            <OrbitControls
              target={[0, -1.1, 0]}
              minDistance={6}
              maxDistance={14}
              minPolarAngle={0.45}
              maxPolarAngle={1.55}
              enablePan={false}
              enableDamping={!reduced}
            />
          </>
        )}
        <Character pet={pet} onClick={onClick} />
        {import.meta.env.DEV &&
          new URLSearchParams(location.search).has("stats") && <Stats />}
      </Canvas>
      {lost && (
        <div className="scene-error" role="alert">
          3D 顯示已中斷，請重新整理。計時與對話仍可使用。
        </div>
      )}
    </SceneBoundary>
  );
}
