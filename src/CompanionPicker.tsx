import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Group, MathUtils } from "three";
import { companions, companionAvailable, type CompanionId } from "./companions";
import type { Action } from "./domain";
import { useWorld } from "./store";
import { Icon } from "./Icon";
import SculptCharacter from "./art/SculptCharacter";

const descriptions: Record<CompanionId, string> = {
  nebula: "會陪你讀書，也會數星星的星球夥伴",
  fern: "帶著一頭搖曳的嫩葉，陪你慢慢走",
  sprout: "把小小的星光頂在頭上",
  mushroom: "喜歡在樹影下歇一會兒",
  aurora: "把極光的顏色帶到你身旁",
  blossom: "頭頂一朵花，帶著花園的氣息",
  stardust: "喜歡在夜空中尋找星塵",
  water: "像一滴水，輕輕晃呀晃",
  puff: "像一小朵雲，喜歡待在你身邊",
};
const greetingActions = { nebula: "stretch", fern: "happy", sprout: "happy", mushroom: "happy", water: "stretch", puff: "happy", blossom: "happy", stardust: "happy", aurora: "happy" } satisfies Record<"nebula" | "fern" | "sprout" | "mushroom" | "water" | "puff" | "blossom" | "stardust" | "aurora", Action>;
const count = companions.length;
const wrap = (value: number) => MathUtils.euclideanModulo(value, count);
const offsetFrom = (index: number, position: number) => wrap(index - position + count / 2) - count / 2;
const turnTime = 2.25;
const greetTime = 1.65;
type Motion = { position: number; target: number; dragging: boolean; settled: number; entryTime: number; ready: boolean[] };

function ModelReady({ index, motion }: { index: number; motion: RefObject<Motion> }) {
  useEffect(() => {
    const ready = motion.current.ready;
    ready[index] = true;
    return () => { ready[index] = false; };
  }, [index, motion]);
  return null;
}

function CharacterPreview({ index, motion, reduced }: {
  index: number; motion: RefObject<Motion>; reduced: boolean;
}) {
  const anchor = useRef<Group>(null);
  const figure = useRef<Group>(null);
  const time = useRef(1);
  const mounted = useRef(Math.abs(offsetFrom(index, motion.current.position)) < 2.2);
  const [near, setNear] = useState(mounted.current);
  const [action, setAction] = useState<Action>("idle");
  const previousAction = useRef<Action>("idle");
  const { viewport } = useThree();
  const { id } = companions[index];
  const available = companionAvailable(id);

  useFrame((_, delta) => {
    if (!anchor.current || !figure.current) return;
    const dt = Math.min(delta, .075);
    const current = motion.current;
    const offset = offsetFrom(index, current.position);
    const distance = Math.abs(offset);
    const shouldMount = distance < 2.2;
    if (shouldMount !== mounted.current) {
      mounted.current = shouldMount;
      setNear(shouldMount);
    }
    const arc = offset * .56;
    const prominence = 1 - MathUtils.smoothstep(distance, 0, 1.25);
    const edge = 1 - MathUtils.smoothstep(distance, 1.48, 2.0);
    const scale = (.77 + .23 * prominence) * (1 + .33 * prominence) * edge;
    const spacing = Math.min(3.4, viewport.width * .48);
    anchor.current.position.set(Math.sin(arc) * spacing, -.88 + .12 * prominence, -3.0 * (1 - Math.cos(arc)));
    anchor.current.visible = edge > .01;
    const entering = !current.dragging && current.target === current.settled
      && wrap(current.settled) === index && current.entryTime >= 0 && current.entryTime < turnTime + greetTime;
    const turning = entering && current.entryTime < turnTime && !reduced;
    const progress = Math.min(1, current.entryTime / turnTime);
    const spin = turning ? 2 * Math.PI * MathUtils.smootherstep(progress, 0, 1) : 0;
    const tilt = -offset * .26;
    const desiredYaw = tilt + spin;
    const difference = Math.atan2(Math.sin(desiredYaw - figure.current.rotation.y), Math.cos(desiredYaw - figure.current.rotation.y));
    figure.current.rotation.y += difference * (1 - Math.exp(-dt * 18));
    figure.current.scale.setScalar(scale);
    figure.current.position.y = reduced ? 0 : (available ? .025 * Math.sin(time.current * 1.6) * prominence : 0)
      + (turning ? .11 * Math.sin(progress * Math.PI) : 0);
    const nextAction = available && entering && current.entryTime >= turnTime ? greetingActions[id] : "idle";
    if (nextAction !== previousAction.current) {
      previousAction.current = nextAction;
      setAction(nextAction);
    }
    if (!reduced && anchor.current.visible) time.current += dt;
  });
  return (
    <group ref={anchor} name={`Carousel-${id}`}>
      <mesh position={[0, -.035, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[.65, .34, 1]}>
        <planeGeometry />
        <shaderMaterial transparent depthWrite={false}
          vertexShader="varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}"
          fragmentShader="varying vec2 p;void main(){float a=1.-smoothstep(.10,.49,length(p-.5));gl_FragColor=vec4(.35,.29,.51,a*.19);}" />
      </mesh>
      <group ref={figure}>
        {near && (
          <Suspense fallback={null}>
            <SculptCharacter companionId={id} action={action} time={time} pet faceOnly={!available} still={reduced && action === "idle"} />
            <ModelReady index={index} motion={motion} />
          </Suspense>
        )}
      </group>
    </group>
  );
}

function NoPreview({ onUnavailable }: { onUnavailable: () => void }) {
  useEffect(onUnavailable, [onUnavailable]);
  return <p className="carousel-fallback">此裝置無法顯示 3D 預覽，仍可用箭頭選角。</p>;
}

function CarouselScene({ motion, reduced, onCenter, onGreeting }: {
  motion: RefObject<Motion>; reduced: boolean;
  onCenter: (index: number) => void; onGreeting: (visible: boolean) => void;
}) {
  const greeting = useRef(false);
  useFrame((_, delta) => {
    const state = motion.current;
    const dt = Math.min(delta, .075);
    if (!state.dragging) {
      state.position = reduced ? state.target : MathUtils.damp(state.position, state.target, 11, dt);
      if (Math.abs(state.position - state.target) < .016) {
        state.position = state.target;
        if (state.settled !== state.target) {
          state.settled = state.target;
          state.entryTime = -1;
          onCenter(wrap(state.settled));
        }
      }
    }
    if (state.entryTime < 0 && state.ready[wrap(state.settled)])
      state.entryTime = reduced ? turnTime : 0;
    if (state.entryTime >= 0) state.entryTime += dt;
    const show = !state.dragging && state.target === state.settled && state.entryTime >= turnTime
      && state.entryTime < turnTime + greetTime
      && companionAvailable(companions[wrap(state.settled)].id);
    if (show !== greeting.current) {
      greeting.current = show;
      onGreeting(show);
    }
  });
  return (
    <>
      <ambientLight intensity={.84} />
      <hemisphereLight args={["#f7eaff", "#a89bb5", 1.15]} />
      <directionalLight position={[-3, 4, 5]} intensity={2.1} color="#fff1e1" />
      <directionalLight position={[3, 3, -4]} intensity={1.7} color="#d1d9ff" />
      {companions.map((c, index) => <CharacterPreview key={c.id} index={index} motion={motion} reduced={reduced} />)}
    </>
  );
}

export function CompanionPicker({ selected, onSelect, onClose }: {
  selected: CompanionId; onSelect: (id: CompanionId) => void; onClose: () => void;
}) {
  const initial = companions.findIndex(c => c.id === selected);
  const motion = useRef<Motion>({ position: initial, target: initial, dragging: false, settled: initial, entryTime: Infinity, ready: [] });
  const drag = useRef<{ id: number; x: number; origin: number; last: number; at: number; speed: number } | null>(null);
  const wheelAt = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [center, setCenter] = useState(initial);
  const [greeting, setGreeting] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const reduced = useWorld(s => s.reduced);
  const current = companions[center];

  function step(direction: number) {
    const state = motion.current;
    if (state.dragging) return;
    state.target += direction;
    state.entryTime = Infinity;
    setGreeting(false);
    if (unavailable) setCenter(wrap(state.target));
  }

  useEffect(() => {
    const element = stage.current;
    const before = document.activeElement;
    close.current?.focus();
    const wheel = (event: WheelEvent) => {
      const axis = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!axis) return;
      event.preventDefault();
      const now = performance.now();
      if (now - wheelAt.current < 160) return;
      wheelAt.current = now;
      step(Math.sign(axis));
    };
    element?.addEventListener("wheel", wheel, { passive: false });
    return () => {
      element?.removeEventListener("wheel", wheel);
      if (before instanceof HTMLElement) before.focus();
    };
  }, [unavailable]);

  function finishDrag(pointerId: number, cancelled = false) {
    const active = drag.current;
    if (active?.id !== pointerId) return;
    const state = motion.current;
    state.dragging = false;
    const momentum = !cancelled && performance.now() - active.at < 95
      ? MathUtils.clamp(active.speed * 110, -.70, .70) : 0;
    state.target = Math.round(state.position + momentum);
    drag.current = null;
    if (unavailable) setCenter(wrap(state.target));
  }

  return (
    <div className="carousel-overlay">
    <section className="companion-picker" role="dialog" aria-modal="true" aria-label="選擇陪伴角色"
      onKeyDown={event => {
        if (event.key === "Tab") {
          const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
          const boundary = event.shiftKey ? buttons[0] : buttons.at(-1);
          if (event.target === boundary) {
            event.preventDefault();
            (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
          }
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          step(event.key === "ArrowRight" ? 1 : -1);
        }
      }}>
      <header>
        <h2>今天，和誰一起？</h2>
        <button ref={close} aria-label="關閉角色選擇" onClick={onClose}><Icon name="close" /></button>
      </header>
      <div className="carousel-stage" ref={stage}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
          const state = motion.current;
          drag.current = { id: event.pointerId, x: event.clientX, origin: state.position, last: state.position, at: performance.now(), speed: 0 };
          state.dragging = true;
          state.entryTime = Infinity;
          setGreeting(false);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const active = drag.current;
          if (!active || active.id !== event.pointerId) return;
          const width = event.currentTarget.clientWidth;
          const position = active.origin + (active.x - event.clientX) / Math.max(72, width * .24);
          const now = performance.now();
          active.speed = (position - active.last) / Math.max(8, now - active.at);
          active.last = position;
          active.at = now;
          motion.current.position = position;
        }}
        onPointerUp={event => finishDrag(event.pointerId)}
        onPointerCancel={event => finishDrag(event.pointerId, true)}
        onLostPointerCapture={event => finishDrag(event.pointerId, true)}>
        <Canvas gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          dpr={[1, 1.25]} camera={{ position: [0, .16, 5.65], fov: 34 }}
          onCreated={({ gl }) => gl.setClearAlpha(0)}
          fallback={<NoPreview onUnavailable={() => setUnavailable(true)} />}>
          <CarouselScene motion={motion} reduced={reduced} onCenter={setCenter} onGreeting={setGreeting} />
        </Canvas>
        {greeting && <p className="character-speech carousel-greeting">Hi～ (｡•̀ᴗ-)✧</p>}
        <button className="carousel-arrow previous" aria-label="上一個角色" onClick={() => step(-1)}><Icon name="arrow" /></button>
        <button className="carousel-arrow next" aria-label="下一個角色" onClick={() => step(1)}><Icon name="arrow" /></button>
      </div>
      <div className="carousel-info" aria-live="polite">
        <span className="carousel-count">{center + 1} / {count}</span>
        <h3>{current.name}</h3>
        <p>{descriptions[current.id]}</p>
        <button className="carousel-select" disabled={!companionAvailable(current.id)} onClick={() => onSelect(current.id)}>
          {companionAvailable(current.id) ? (current.id === selected ? "繼續陪伴" : `選擇${current.name}`) : "開發中"}
        </button>
      </div>
    </section>
    </div>
  );
}
