import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Stats, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useWorld } from "./store";
import { type Action } from "./domain";
import { advanceBehavior, initialBehavior } from "./behavior";
const height = (x: number, z: number) =>
  Math.sqrt(Math.max(0, 2.8 ** 2 - x * x - z * z)) - 2.6;
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
function Tree({ x, z, size = 1 }: { x: number; z: number; size?: number }) {
  return (
    <group position={[x, height(x, z), z]} scale={size}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.07, 0.7, 8]} />
        <meshStandardMaterial color="#998c78" />
      </mesh>
      <Ball position={[0, 0.8, 0]} scale={[0.34, 0.48, 0.33]} color="#739c8d" />
      <Ball
        position={[0.21, 0.68, 0.02]}
        scale={[0.23, 0.3, 0.23]}
        color="#8fb09a"
      />
    </group>
  );
}
function Planet() {
  const pebbles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const a = i * 2.399;
        const r = 1.1 + (i % 4) * 0.25;
        return {
          x: Math.cos(a) * r,
          z: Math.sin(a) * r,
          size: 0.07 + (i % 3) * 0.03,
        };
      }),
    [],
  );
  return (
    <group>
      <Ball position={[0, -2.6, 0]} scale={[2.8, 2.8, 2.8]} color="#829a8d" />
      <Ball
        position={[0, -2.68, 0]}
        scale={[2.76, 2.76, 2.76]}
        color="#788577"
      />
      <group position={[0.72, height(0.72, -0.5), -0.5]}>
        <Box position={[0, 0.5, 0]} size={[1, 0.09, 0.6]} color="#d1b391" />
        {[-0.4, 0.4].flatMap((x) =>
          [-0.23, 0.23].map((z) => (
            <Box
              key={`${x}${z}`}
              position={[x, 0.25, z]}
              size={[0.06, 0.5, 0.06]}
              color="#a48b72"
            />
          )),
        )}
        <group position={[-0.1, 0.568, 0]} rotation={[-0.14, 0, 0]}>
          <Box size={[0.42, 0.025, 0.29]} color="#ede2c8" />
          <Box
            position={[0, 0.018, 0]}
            size={[0.008, 0.012, 0.29]}
            color="#aa9273"
          />
        </group>
        <mesh position={[0.32, 0.62, -0.12]}>
          <cylinderGeometry args={[0.065, 0.052, 0.13, 16]} />
          <meshStandardMaterial color="#c7d5cf" />
        </mesh>
        <Box position={[0, 0.2, 0.63]} size={[0.48, 0.09, 0.45]} />
        <Box position={[0, 0.42, 0.84]} size={[0.48, 0.47, 0.06]} />
        {[-0.18, 0.18].flatMap((x) =>
          [0.48, 0.78].map((z) => (
            <Box
              key={`${x}${z}`}
              position={[x, 0.08, z]}
              size={[0.05, 0.18, 0.05]}
            />
          )),
        )}
      </group>
      <Tree x={-1.4} z={-0.7} size={1.05} />
      <Tree x={-0.8} z={-1.45} size={0.8} />
      <Tree x={1.65} z={-0.65} size={0.64} />
      <group
        position={[-1.15, height(-1.15, 0.6), 0.6]}
        rotation={[0, -0.3, 0]}
      >
        <Ball scale={[0.48, 0.055, 0.33]} color="#c9b7ae" />
        <Box
          position={[0.1, 0.08, -0.1]}
          size={[0.3, 0.1, 0.23]}
          color="#e3d3bd"
        />
      </group>
      {pebbles.map((p, i) => (
        <Ball
          key={i}
          position={[p.x, height(p.x, p.z) + 0.02, p.z]}
          scale={[p.size, p.size * 0.6, p.size * 0.8]}
          color={i % 3 === 0 ? "#bbbaa5" : "#93aa98"}
        />
      ))}
      {[
        [-1.6, 0.2],
        [1.2, 0.85],
        [0.2, -1.5],
      ].map(([x, z], i) => (
        <group key={i} position={[x, height(x, z), z]}>
          <mesh position={[0, 0.13, 0]}>
            <cylinderGeometry args={[0.13, 0.09, 0.25, 12]} />
            <meshStandardMaterial color="#bca08e" />
          </mesh>
          <Ball
            position={[0, 0.35, 0]}
            scale={[0.14, 0.2, 0.14]}
            color="#a8b894"
          />
        </group>
      ))}
      <group position={[1.5, height(1.5, 0.15), 0.15]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.025, 0.035, 1, 8]} />
          <meshStandardMaterial color="#6d7d72" />
        </mesh>
        <Ball
          position={[0, 1.03, 0]}
          scale={[0.11, 0.14, 0.11]}
          color="#f2d7a1"
        />
        <pointLight
          position={[0, 1, 0]}
          color="#ffdda5"
          intensity={0.5}
          distance={2}
        />
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
    const blink = Math.sin(t * 0.71) > 0.991 || sleeping;
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
          <mesh position={[0, 0.4, 0]} scale={[0.34, 0.42, 0.29]} castShadow>
            <sphereGeometry args={[1, 32, 24]} />
            <meshStandardMaterial
              color="#acd9e4"
              roughness={0.32}
              metalness={0.08}
              transparent
              opacity={0.94}
            />
          </mesh>
          <Ball
            position={[-0.15, 0.19, 0.14]}
            scale={[0.14, 0.08, 0.16]}
            color="#91becd"
          />
          <Ball
            position={[0.15, 0.19, 0.14]}
            scale={[0.14, 0.08, 0.16]}
            color="#91becd"
          />
          {[-1, 1].map((s) => (
            <group
              key={s}
              position={[s * 0.15, 0.74, 0]}
              rotation={[0, 0, -s * 0.28]}
            >
              <mesh position={[0, 0.08, 0]}>
                <capsuleGeometry args={[0.027, 0.15, 4, 8]} />
                <meshStandardMaterial color="#b4dee6" />
              </mesh>
              <Ball
                position={[0, 0.18, 0]}
                scale={[0.052, 0.052, 0.052]}
                color="#e9e0aa"
              />
            </group>
          ))}
          <group ref={eyes} position={[0, 0.49, 0.26]}>
            {[-1, 1].map((s) => (
              <group key={s}>
                <Ball
                  position={[s * 0.105, 0, 0.005]}
                  scale={[0.026, 0.042, 0.02]}
                  color="#273e52"
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
            position={[-0.19, 0.4, 0.24]}
            scale={[0.049, 0.022, 0.018]}
            color="#d8b9c2"
          />
          <Ball
            position={[0.19, 0.4, 0.24]}
            scale={[0.049, 0.022, 0.018]}
            color="#d8b9c2"
          />
          <mesh position={[0, 0.405, 0.282]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.028, 0.006, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#4e7684" />
          </mesh>
          <group ref={left} position={[-0.29, 0.43, 0]}>
            <Ball
              position={[-0.05, -0.07, 0.025]}
              scale={[0.09, 0.16, 0.09]}
              color="#9dcbd7"
            />
          </group>
          <group ref={right} position={[0.29, 0.43, 0]}>
            <Ball
              position={[0.05, -0.07, 0.025]}
              scale={[0.09, 0.16, 0.09]}
              color="#9dcbd7"
            />
          </group>
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
  const behavior = useRef({ ...initialBehavior });
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
          .set(position.current.x, surface + 2.6, position.current.z)
          .normalize();
        root.current.quaternion.setFromUnitVectors(up, normal);
      }
    }
    if (model.current) {
      const angle = pet
        ? 0
        : state.timer.phase === "focus" && distance < 0.08
          ? Math.PI
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
      <group ref={model}>
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
        shadows
        dpr={[1, 1.7]}
        camera={{
          position: pet ? [0, 0.45, 3.1] : [6, 5.6, 9.6],
          fov: pet ? 30 : 42,
        }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#101c29", pet ? 0 : 1);
          gl.domElement.setAttribute(
            "aria-label",
            pet ? "星雲仔桌寵" : "可拖曳旋轉的 3D 星球",
          );
        }}
      >
        <RendererHealth onLost={setLost} />
        <ambientLight intensity={1.1} />
        <hemisphereLight args={["#e0edf4", "#7a8c78", 1.8]} />
        <directionalLight
          position={[-3, 7, 5]}
          intensity={2.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
          shadow-normalBias={0.04}
        />
        {!pet && (
          <>
            <Planet />
            <Stars
              radius={65}
              depth={30}
              count={380}
              factor={2}
              saturation={0}
              fade
              speed={0}
            />
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
