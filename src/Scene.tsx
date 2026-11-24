import { safeDrop } from "./art/placement";
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
import { OrbitControls, Stats, Html } from "@react-three/drei";
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
function Character({
  pet,
  onClick,
  speech,
}: {
  pet: boolean;
  onClick: () => void;
  speech: string;
}) {
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
  const { gl, camera, controls } = useThree();
  const held = useRef(false);
  const manualUntil = useRef(0);
  const phase = useRef(useWorld.getState().timer.phase);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    offset: THREE.Vector3;
    plane: THREE.Plane;
  } | null>(null);
  const petOffset = useRef(new THREE.Vector3());
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const intersect = (e: PointerEvent, plane: THREE.Plane) => {
    const b = gl.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - b.left) / b.width) * 2 - 1,
      (-(e.clientY - b.top) / b.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    return ray.ray.intersectPlane(plane, hit);
  };
  useEffect(() => {
    const orbit = controls as unknown as { enabled: boolean } | null;
    if (orbit && drag.current) orbit.enabled = false;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) held.current = true;
      if (!held.current) return;
      e.preventDefault();
      if (pet && window.desktop) {
        window.desktop.moveGrab();
        gl.domElement.dataset.held = "true";
        return;
      }
      const point = intersect(e, d.plane);
      if (!point) return;
      point.sub(d.offset);
      if (pet) {
        petOffset.current.set(
          THREE.MathUtils.clamp(point.x, -0.45, 0.45),
          THREE.MathUtils.clamp(point.y + 0.55, -0.3, 0.3),
          0,
        );
      } else {
        const [x, z] = safeDrop(point.x, point.z);
        position.current.set(x, 0, z);
      }
      gl.domElement.dataset.held = "true";
    };
    const finish = (e?: PointerEvent) => {
      const d = drag.current;
      if (!d || (e && e.pointerId !== d.id)) return;
      const moved = held.current;
      drag.current = null;
      held.current = false;
      if (pet) window.desktop?.endGrab();
      if (orbit) orbit.enabled = true;
      gl.domElement.style.cursor = "grab";
      gl.domElement.dataset.held = "false";
      if (gl.domElement.hasPointerCapture(d.id))
        gl.domElement.releasePointerCapture(d.id);
      if (moved) {
        manualUntil.current = Date.now() + 20000;
        behavior.current = {
          ...behavior.current,
          action: "idle",
          target: [position.current.x, position.current.z],
          home: [position.current.x, position.current.z],
          until: 0,
        };
      } else if (e && e.type === "pointerup") onClick();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    const blur = () => finish();
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("blur", blur);
      if (orbit) orbit.enabled = true;
    };
  });
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
    if (phase.current !== state.timer.phase) {
      phase.current = state.timer.phase;
      manualUntil.current = 0;
    }
    const manual = held.current || Date.now() < manualUntil.current;
    if (!manual)
      behavior.current = advanceBehavior(
        behavior.current,
        state.timer.phase,
        state.reaction,
        state.reactionUntil,
        Date.now(),
        _state.clock.elapsedTime,
      );
    action.current = manual
      ? state.reaction && state.reactionUntil > Date.now()
        ? state.reaction === "read"
          ? "listen"
          : state.reaction
        : "idle"
      : behavior.current.action;
    if (!manual)
      target.current.set(
        behavior.current.target[0],
        0,
        behavior.current.target[1],
      );
    const distance = manual ? 0 : position.current.distanceTo(target.current);
    waypoint(position.current, target.current, next);
    if (!manual) position.current.lerp(next, 1 - Math.exp(-motionDt * 1.3));
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
        root.current.position.set(
          petOffset.current.x,
          -0.55 + petOffset.current.y + (held.current ? 0.18 : 0),
          0,
        );
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
              (held.current ? 0.28 : 0) +
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
      onPointerDown={(e) => {
        if (drag.current || e.button !== 0) return;
        e.stopPropagation();
        const plane = pet
          ? new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
          : new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const point = intersect(e.nativeEvent, plane);
        if (!point) return;
        const origin = pet
          ? new THREE.Vector3(
              petOffset.current.x,
              -0.55 + petOffset.current.y,
              0,
            )
          : position.current;
        drag.current = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          offset: point.clone().sub(origin),
          plane,
        };
        if (controls)
          (controls as unknown as { enabled: boolean }).enabled = false;
        if (pet) window.desktop?.beginGrab();
        gl.domElement.setPointerCapture(e.pointerId);
        gl.domElement.style.cursor = "grabbing";
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!drag.current) gl.domElement.style.cursor = "grab";
      }}
      onPointerOut={() => {
        if (!drag.current) gl.domElement.style.cursor = "auto";
      }}
    >
      <group ref={model}>
        <SculptCharacter
          action={visual}
          held={held}
          time={clock}
          seatBlend={pet ? undefined : seatBlend}
          modelUrl={import.meta.env.VITE_CHARACTER_MODEL_URL}
        />
      </group>
      {speech && (
        <Html
          position={[0, pet ? 1.55 : 1.9, 0]}
          center
          style={{ pointerEvents: "none", width: 190 }}
        >
          <div className="character-speech" role="note" aria-live="polite">
            {speech}
          </div>
        </Html>
      )}
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
  speech = "",
}: {
  pet: boolean;
  onClick: () => void;
  reduced: boolean;
  speech?: string;
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
              makeDefault
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
          <Character pet={pet} onClick={onClick} speech={speech} />
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
