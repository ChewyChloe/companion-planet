import { Coast } from "./art/Coast";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import * as THREE from "three";
import { useWorld } from "./store";
import { type Action } from "./domain";
import { advanceBehavior, initialBehavior } from "./behavior";
import { RenderQuality } from "./art/RenderQuality";
import SculptCharacter from "./art/SculptCharacter";
import { World, ArtLights } from "./art/World";
import {
  groundHeight as height,
  groundNormal,
  waypoint,
  CHAIR,
  HOME,
  smoothstep,
} from "./art/terrain";
function Character({ pet, onClick }: { pet: boolean; onClick: () => void }) {
  const root = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const seatBlend = useRef(0);
  const action = useRef<Action>("idle");
  const target = useRef(new THREE.Vector3(HOME[0], 0, HOME[1]));
  const position = useRef(new THREE.Vector3(HOME[0], 0, HOME[1]));
  const behavior = useRef({ ...initialBehavior, until: 8 });
  const rendered = useRef<Action>("idle");
  const [visual, setVisual] = ReactUseState<Action>("idle");
  const { gl, camera } = useThree();
  const normal = useMemo(() => new THREE.Vector3(), []);
  const screen = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const frames = useRef(0);
  const next = useMemo(() => new THREE.Vector3(), []);
  useFrame((_state, delta) => {
    const state = useWorld.getState();
    const dt = Math.min(delta, 0.1);
    const motionDt = Math.min(delta, 0.25);
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
    waypoint(position.current, target.current, next);
    position.current.lerp(next, 1 - Math.exp(-motionDt * 1.3));
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
        root.current.position.set(0, -0.55, 0);
        root.current.quaternion.identity();
      } else {
        const surface = height(position.current.x, position.current.z);
        seatBlend.current =
          1 -
          smoothstep(
            0.12,
            0.65,
            Math.hypot(
              position.current.x - CHAIR.x,
              position.current.z - CHAIR.z,
            ),
          );
        root.current.position.set(
          position.current.x,
          THREE.MathUtils.damp(
            root.current.position.y,
            surface +
              CHAIR.seatedRootOffset * seatBlend.current +
              (actual === "rest" ? 0.065 : 0),
            5,
            motionDt,
          ),
          position.current.z,
        );
        groundNormal(position.current.x, position.current.z, normal);
        root.current.quaternion.setFromUnitVectors(up, normal);
      }
    }
    if (model.current) {
      const angle = pet
        ? 0
        : state.timer.phase === "focus" && distance < 0.08
          ? 0
          : distance > 0.07
            ? Math.atan2(
                next.x - position.current.x,
                next.z - position.current.z,
              )
            : 0.35;
      const difference = Math.atan2(
        Math.sin(angle - model.current.rotation.y),
        Math.cos(angle - model.current.rotation.y),
      );
      model.current.rotation.y += difference * (1 - Math.exp(-motionDt * 4));
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
        screen.y += 0.75;
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
        <SculptCharacter
          action={visual}
          time={clock}
          seatBlend={pet ? undefined : seatBlend}
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
      camera.fov = pet ? 34 : 40;
      if (pet) {
        camera.clearViewOffset();
        camera.lookAt(0, 0.3, 0);
      } else {
        const aspect = size.width / size.height,
          scale = Math.max(1, 0.75 / aspect);
        camera.position.set(6 * scale, 3.6 * scale, 10 * scale);
        camera.setViewOffset(
          size.width,
          size.height,
          size.width * (size.width < 700 || aspect < 0.85 ? 0 : 0.25),
          -size.height * 0.2,
          size.width,
          size.height,
        );
        camera.lookAt(0, 0.2, 0);
      }
      camera.updateProjectionMatrix();
    }
  }, [camera, pet, size.width, size.height]);
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
        dpr={[1, 1.5]}
        camera={{
          position: pet ? [0, 0.45, 3.5] : [6, 3.6, 10],
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
        <RenderQuality />
        <RendererHealth onLost={setLost} />
        <ArtLights pet={pet} />
        {!pet && (
          <>
            <Coast reduced={reduced} />
            <World shoreline />
            <OrbitControls
              target={[0, 0.2, 0]}
              minDistance={8}
              maxDistance={28}
              minPolarAngle={0.45}
              maxPolarAngle={1.55}
              enablePan={false}
              enableDamping={!reduced}
            />
          </>
        )}
        <Suspense fallback={null}>
          <Character pet={pet} onClick={onClick} />
        </Suspense>
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
