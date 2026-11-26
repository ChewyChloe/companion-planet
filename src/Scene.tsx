import { resolveBodyContact, collisionRevision } from "./art/world-collision";
import { suppliedFlower,suppliedLamp,suppliedView } from "./art/supplied-world-config";
import { userHome } from "./art/user-world-ground";
import { headingFromStep, turnToward } from "./art/locomotion";
import { RESIDENT_SCALE, residentFocusHeight } from "./art/resident-assets";
import { NebulaBloom } from "./art/NebulaBloom";
import { JourneyCamera } from "./art/JourneyCamera";
import { CanvasGestures } from "./art/CanvasGestures";
import { Atmosphere } from "./art/Atmosphere";
import { SoftEnvironment } from "./art/SoftEnvironment";
import { planets } from "./planets";
import { safeDrop } from "./art/placement";
import { Cosmos, destinationPositions } from "./art/Cosmos";
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
import { type Action, allowedAction } from "./domain";
import { advanceBehavior, idlePause, initialBehavior } from "./behavior";
import { RenderQuality } from "./art/RenderQuality";
import SculptCharacter from "./art/SculptCharacter";
import { World, ArtLights } from "./art/World";
import {
  walkingHeight as height,
  groundNormal,
  waypoint,
  CHAIR,
  smoothstep,
} from "./art/terrain";
function Character({ pet, onClick }: { pet: boolean; onClick: () => void }) {
  const poseLocked = new URLSearchParams(location.search).has("still");
  const heading = useRef(useWorld.getState().planetId === "forest" ? 2.6 : .35);
  const root = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const gaitClock = useRef(0);
  const seatBlend = useRef(0);
  const action = useRef<Action>("idle");
  const spawn = userHome(useWorld.getState().planetId);
  const target = useRef(new THREE.Vector3(spawn[0], 0, spawn[1]));
  const position = useRef(new THREE.Vector3(spawn[0], 0, spawn[1]));
  const behavior = useRef({ ...initialBehavior, target:spawn, home:spawn, until: idlePause() });
  const rendered = useRef<Action>("idle");
  const [visual, setVisual] = ReactUseState<Action>("idle");
  const { gl, camera, controls } = useThree();
  const held = useRef(false);
  const manualUntil = useRef(0);
  const walking = useRef(false);
  const arrivalAction = useRef<Action>("idle");
  const command = useRef(0);
  const worldRevision = useRef(-1);
  const reactionCommand = useRef(0);
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
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
        held.current = true;
        walking.current = false;
      }
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
        arrivalAction.current = "idle";
        manualUntil.current = Date.now() + 20000;
        behavior.current = {
          ...behavior.current,
          action: "idle",
          target: [position.current.x, position.current.z],
          home: [position.current.x, position.current.z],
          until: 0,
        };
      } else if (
        e &&
        e.type === "pointerup" &&
        gl.domElement.dataset.multiTouch !== "true"
      )
        onClick();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    const blur = () => finish();
    window.addEventListener("blur", blur);
    window.addEventListener("companion-multi-touch", blur);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("blur", blur);
      window.removeEventListener("companion-multi-touch", blur);
      if (orbit) orbit.enabled = true;
    };
  });
  const normal = useMemo(() => new THREE.Vector3(), []);
  const screen = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const supportRotation = useMemo(() => new THREE.Quaternion(), []);
  const frames = useRef(0);
  const travelProgress = useRef({ x: Infinity, z: Infinity, best: Infinity, stalled: 0 });
  const next = useMemo(() => new THREE.Vector3(), []);
  useFrame((_state, delta) => {
    const state = useWorld.getState();
    if (!pet && worldRevision.current !== collisionRevision()) {
      worldRevision.current = collisionRevision();
      const [x,z]=safeDrop(position.current.x,position.current.z);
      position.current.set(x,0,z);target.current.copy(position.current);
      behavior.current={...behavior.current,target:[x,z],home:[x,z]};
    }
    const reaction = state.reaction
      ? allowedAction(state.reaction, state.timer.phase)
      : null;
    const dt = Math.min(delta, 0.25);
    const motionDt = Math.min(delta, 0.05);
    clock.current += state.reduced ? dt * 0.18 : dt;
    if (phase.current !== state.timer.phase) {
      phase.current = state.timer.phase;
      manualUntil.current = 0;
      walking.current = false;
    }
    if (state.reactionUntil !== reactionCommand.current) {
      reactionCommand.current = state.reactionUntil;
      if (!held.current && (reaction === "read" || reaction === "rest")) {
        manualUntil.current = Date.now() + 60000;
        walking.current = true;
        arrivalAction.current = reaction;
        target.current.set(
          reaction === "read" ? CHAIR.x : safeDrop(-1.1,.65)[0],
          0,
          reaction === "read" ? CHAIR.z : safeDrop(-1.1,.65)[1],
        );
      }
    }
    if (
      state.destination &&
      state.destination.serial !== command.current &&
      !pet
    ) {
      arrivalAction.current = "idle";
      command.current = state.destination.serial;
      const [x, z] = safeDrop(state.destination.x, state.destination.z);
      target.current.set(x, 0, z);
      walking.current = true;
      manualUntil.current = Date.now() + 60000;
    }
    if (walking.current && position.current.distanceTo(target.current) < 0.07) {
      walking.current = false;
      manualUntil.current = Date.now() + 20000;
      behavior.current = {
        ...behavior.current,
        target: [position.current.x, position.current.z],
        home: [position.current.x, position.current.z],
        action: arrivalAction.current,
      };
    }
    const manual = poseLocked || held.current || Date.now() < manualUntil.current;
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
      ? reaction && state.reactionUntil > Date.now()
        ? reaction === "read"
          ? arrivalAction.current === "read"
            ? "read"
            : "listen"
          : reaction
        : arrivalAction.current
      : behavior.current.action;
    if (!manual)
      target.current.set(
        behavior.current.target[0],
        0,
        behavior.current.target[1],
      );
    const strolling = !pet && !manual && state.timer.phase === "idle" && action.current === "walk";
    const distance =
      manual && !walking.current
        ? 0
        : position.current.distanceTo(target.current);
    const beforeX = position.current.x, beforeZ = position.current.z;
    if (!pet && !held.current && distance > (strolling ? .07 : .001)) {
      waypoint(position.current, target.current, next, action.current === "read");
      const speed = strolling ? .42 : .82;
      position.current.lerp(next, Math.min(1, speed * motionDt / Math.max(.001, position.current.distanceTo(next))));
    } else if (strolling) {
      behavior.current = {
        ...behavior.current,
        action: "idle",
        target: [position.current.x, position.current.z],
        until: _state.clock.elapsedTime + idlePause(),
      };
    }
    const plannedX = position.current.x - beforeX;
    const plannedZ = position.current.z - beforeZ;
    gaitClock.current += Math.hypot(position.current.x-beforeX, position.current.z-beforeZ) / .48 * (Math.PI*2/7.1);
    const actual =
      distance > 0.07 && !pet && Math.hypot(plannedX, plannedZ) > .0001
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
        const seating = action.current === "read";
        seatBlend.current = seating ?
          1 -
          smoothstep(
            0.12,
            1.10,
            Math.hypot(
              position.current.x - CHAIR.x,
              position.current.z - CHAIR.z,
            ),
          ) : 0;
        const climb = seating ? 1 - smoothstep(.12,1.45,Math.hypot(position.current.x-CHAIR.x,position.current.z-CHAIR.z)) : 0;
        const seatDistance=Math.hypot(position.current.x-CHAIR.x,position.current.z-CHAIR.z);
        const clearanceArc=seating ? .85*smoothstep(.12,.35,seatDistance)*(1-smoothstep(1.6,1.9,seatDistance)) : 0;
        const supportY = .10*(1-climb) + surface + (held.current ? .28 : 0) + CHAIR.seatedRootOffset*climb + clearanceArc + (actual === "rest" ? .065 : 0);
        root.current.position.set(
          position.current.x,
          Math.max(surface+.04, THREE.MathUtils.damp(root.current.position.y,supportY,8,motionDt)),
          position.current.z,
        );
        if (!seating || seatDistance>1.8) resolveBodyContact(state.planetId,root.current.position);
        position.current.x=root.current.position.x;
        position.current.z=root.current.position.z;
        groundNormal(position.current.x, position.current.z, normal);
        normal.lerp(up, seatBlend.current).normalize();
        supportRotation.setFromUnitVectors(up, normal);
        root.current.quaternion.slerp(supportRotation, 1-Math.exp(-8*motionDt));
        gl.domElement.dataset.supportTilt = THREE.MathUtils.radToDeg(root.current.quaternion.angleTo(new THREE.Quaternion())).toFixed(3);
      }
    }
    const progress = travelProgress.current;
    if (progress.x !== target.current.x || progress.z !== target.current.z || held.current) {
      Object.assign(progress, { x: target.current.x, z: target.current.z, best: Infinity, stalled: 0 });
    }
    if (!pet && !held.current && distance > .07 && (!manual || walking.current)) {
      const remaining = position.current.distanceTo(target.current);
      if (remaining < progress.best - .06) {
        progress.best = remaining;
        progress.stalled = 0;
      } else if ((progress.stalled += motionDt) > 4) {
        // Abandon an unreachable command instead of pushing into the same obstacle every frame.
        walking.current = false;
        arrivalAction.current = "idle";
        manualUntil.current = Date.now() + (strolling ? 2000 : 8000);
        target.current.copy(position.current);
        behavior.current = { ...behavior.current, action: "idle", target: [position.current.x, position.current.z], until: strolling ? 0 : behavior.current.until };
      }
    }
    if (model.current) {
      if (pet) heading.current = 0;
      else if (!held.current) {
        const movedX = position.current.x - beforeX, movedZ = position.current.z - beforeZ;
        if (plannedX * movedX + plannedZ * movedZ > .35 * (plannedX ** 2 + plannedZ ** 2))
          heading.current = headingFromStep(heading.current, plannedX, plannedZ);
        if (distance < .08 && (actual === "read" || seatBlend.current > .9)) heading.current = 0;
      }
      model.current.rotation.y = turnToward(model.current.rotation.y, heading.current, motionDt);
      gl.domElement.dataset.heading = model.current.rotation.y.toFixed(5);
      gl.domElement.dataset.step = `${position.current.x-beforeX},${position.current.z-beforeZ}`;
    }

    if (root.current) {
      screen.copy(root.current.position);
      screen.y += pet ? 1.55 : 1.9;
      screen.project(camera);
      const host = gl.domElement.closest(".world") as HTMLElement | null;
      host?.style.setProperty("--speech-x", `${(screen.x + 1) * 50}%`);
      host?.style.setProperty("--speech-y", `${(1 - screen.y) * 50}%`);
    }
    if (++frames.current % 3 === 0) {
      gl.domElement.dataset.action = actual;
      gl.domElement.dataset.planet = state.planetId;
      gl.domElement.dataset.lampOn = String(state.lampOn);
      const lamp = new THREE.Vector3(...suppliedLamp(state.planetId)).project(camera);
      gl.domElement.dataset.lampScreen = `${(lamp.x + 1) / 2},${(1 - lamp.y) / 2}`;
      const flower = new THREE.Vector3(...suppliedFlower(state.planetId)).project(camera);
      gl.domElement.dataset.flowerScreen = `${(flower.x + 1) / 2},${(1 - flower.y) / 2}`;
      gl.domElement.dataset.flowersBloom = String(state.flowersBloom);
      gl.domElement.dataset.reaction = state.reaction || "none";
      gl.domElement.dataset.frames = String(frames.current);
      gl.domElement.dataset.camera = camera.position
        .toArray()
        .map((x) => x.toFixed(2))
        .join(",");
      if (root.current) {
        screen.copy(root.current.position);
        screen.y += residentFocusHeight(state.companionId);
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
      name="CharacterPlacement"
      ref={root}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        if (gl.domElement.dataset.multiTouch === "true") return;
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
      <mesh name="ResidentTapTarget" position={[0, .86, 0]} scale={[.62, .70, .52]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <group name="CharacterFacing" ref={model} scale={pet ? 1 : RESIDENT_SCALE}>
        <SculptCharacter
          pet={pet}
          still={poseLocked}
          action={visual}
          held={held}
          time={clock}
          gaitTime={gaitClock}
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
  const planetId=useWorld(s=>s.planetId);
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = pet ? 34 : 40;
      if (pet) {
        camera.clearViewOffset();
        camera.lookAt(0, 0.3, 0);
      } else {
        const aspect = size.width / size.height,
          scale = Math.max(1, 1.05 / aspect);
        if(useWorld.getState().journey)return;
        const view=suppliedView(planetId,scale);
        camera.position.set(...view.position);
        camera.setViewOffset(
          size.width,
          size.height,
          0,
          -size.height * 0.025,
          size.width,
          size.height,
        );
        camera.lookAt(...suppliedView(planetId).focus);
      }
      camera.updateProjectionMatrix();
    }
  }, [camera, pet, size.width, size.height,planetId]);
  return null;
}
export default function Scene({
  pet,
  onClick,
  reduced,
  speech = "",
  pickerOpen = false,
}: {
  pet: boolean;
  onClick: () => void;
  reduced: boolean;
  speech?: string;
  pickerOpen?: boolean;
}) {
  const [lost, setLost] = ReactUseState(false);
  const planetId = useWorld((s) => s.planetId);
  const hoveredPlanet = useWorld((s) => s.hoveredPlanet);
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
        onCreated={({ gl, raycaster }) => {
          raycaster.params.Line.threshold = 0.025;
          raycaster.params.Points.threshold = 0.035;
          gl.transmissionResolutionScale = 0.35;
          gl.setClearColor("#f4f1e8", 0);
          gl.domElement.setAttribute(
            "aria-label",
            pet ? "星雲仔桌寵" : "可拖曳旋轉的 3D 星球",
          );
        }}
      >
        {!pet && <NebulaBloom paused={pickerOpen} />}
        <CanvasGestures />
        <CameraFraming pet={pet} />
        <RenderQuality />
        <RendererHealth onLost={setLost} />
        <SoftEnvironment />
        <ArtLights pet={pet} />
        {!pet && (
          <>
            <Atmosphere reduced={reduced} />
            <Cosmos />
            <JourneyCamera />
            <World key={planetId} />
            <OrbitControls
              makeDefault
              target={suppliedView(planetId).focus}
              minDistance={8}
              maxDistance={80}
              minPolarAngle={0.45}
              maxPolarAngle={1.55}
              enablePan={false}
              enableDamping={!reduced}
            />
          </>
        )}
        <Suspense fallback={null}>
          <Character key={planetId} pet={pet} onClick={onClick} />
        </Suspense>
        {import.meta.env.DEV &&
          new URLSearchParams(location.search).has("stats") && <Stats />}
      </Canvas>
      {!pet && <div className="journey-fog" />}
      {!pet && (
        <nav className="planet-destinations" aria-label="星球旅行">
          {planets
            .filter((p) => p.id !== planetId)
            .map((p, i) => (
              <button
                key={p.id}
                className={`distant-planet ${hoveredPlanet === p.id ? "hovered" : ""}`}
                style={{
                  left: `${destinationPositions[i][0]}%`,
                  top: `${destinationPositions[i][1]}%`,
                }}
                onMouseEnter={() => useWorld.getState().hoverPlanet(p.id)}
                onMouseLeave={() => useWorld.getState().hoverPlanet(null)}
                onClick={() => useWorld.getState().visit(p.id)}
                aria-label={`前往${p.short}`}
              >
                <span>{p.short}</span>
              </button>
            ))}
        </nav>
      )}
      {speech && (
        <div className="scene-speech">
          <div className="character-speech" role="note" aria-live="polite">
            {(() => {
              const faceStart = speech.search(/\s(?=[^\s()]*\()/);
              return faceStart < 0 ? speech : <>
                {speech.slice(0, faceStart)}{" "}
                <span className="speech-kaomoji">{speech.slice(faceStart+1)}</span>
              </>;
            })()}
          </div>
        </div>
      )}
      {lost && (
        <div className="scene-error" role="alert">
          3D 顯示已中斷，請重新整理。計時與對話仍可使用。
        </div>
      )}
    </SceneBoundary>
  );
}
