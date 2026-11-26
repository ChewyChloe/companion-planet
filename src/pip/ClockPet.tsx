import { Suspense, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, Vector3 } from "three";
import { Icon } from "../Icon";
import { formatTimerPart } from "../domain";
import { useWorld } from "../store";
import { SceneBoundary } from "../SceneBoundary";
import { ClockPlanet } from "./ClockPlanet";
import { ClockResident } from "./ClockResident";

function WindowFrames({ host, surface }: { host: Window; surface: RefObject<HTMLElement | null> }) {
  const advance = useThree(state => state.advance);
  const setSize = useThree(state => state.setSize);
  useLayoutEffect(() => {
    // The PiP document can resize independently from the opener's Canvas observer.
    const resize = () => {
      if (!surface.current) return;
      const { width, height, top, left } = surface.current.getBoundingClientRect();
      if (width && height) setSize(width, height, top, left);
    };
    resize();
    host.addEventListener("resize", resize);
    let handle = 0;
    let previous = host.performance.now();
    let elapsed = 0;
    const frame = (now: number) => {
      const interval = now - previous;
      if (interval >= 31) {
        previous = now;
        elapsed += Math.min(interval, 70) / 1000;
        advance(elapsed, false);
      }
      handle = host.requestAnimationFrame(frame);
    };
    handle = host.requestAnimationFrame(frame);
    return () => {
      host.removeEventListener("resize", resize);
      host.cancelAnimationFrame(handle);
    };
  }, [advance, host, setSize, surface]);
  return null;
}

function ClockCamera({ face }: { face: RefObject<HTMLDivElement | null> }) {
  const camera = useThree(state => state.camera);
  const { width, height } = useThree(state => state.size);
  const marker = useMemo(() => new Vector3(), []);
  useLayoutEffect(() => {
    if (!(camera instanceof OrthographicCamera) || !height || !width) return;
    const framing = Math.max(1.28, 1.10 * height / width);
    camera.zoom = height / framing;
    camera.lookAt(0, .48, 0);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);
  useFrame(() => {
    if (!face.current) return;
    marker.set(0, .424, .42).project(camera);
    face.current.style.left = `${(marker.x + 1) * 50}%`;
    face.current.style.top = `${(1 - marker.y) * 50}%`;
  });
  return null;
}

export function ClockPet({ host, face, celebration, onCommand, onReturn }: {
  host: Window;
  face: RefObject<HTMLDivElement | null>;
  celebration: number;
  onCommand: (command: "start" | "pause") => void;
  onReturn: () => void;
}) {
  const surface = useRef<HTMLElement>(null);
  const timer = useWorld(state => state.timer);
  const night = useWorld(state => state.night);
  const seconds = Math.ceil(timer.remaining / 1000);
  const stage = timer.phase !== "break" ? "專注" : timer.breakKind === "long" ? "長休息" : "短休息";
  const display = `${formatTimerPart(Math.floor(seconds / 60))}:${formatTimerPart(seconds % 60)}`;

  return (
    <section ref={surface} className="clock-pet" data-night={night} aria-label="星球鐘浮動桌寵">
      <SceneBoundary fallback={<div className="clock-pet-load" role="status">3D 星球暫時無法載入</div>}>
        <Canvas orthographic camera={{ position: [.035, .93, 3.2], near: .01, far: 20 }}
          dpr={[1, 1.5]} frameloop="never" gl={{ alpha: true, antialias: true }}
          fallback={<div className="clock-pet-load" role="status">這個裝置無法顯示 3D 星球</div>}>
          <WindowFrames host={host} surface={surface} />
          <ClockCamera face={face} />
          <hemisphereLight args={["#fff4ff", "#b0a3cf", 2]} />
          <directionalLight position={[-2, 4, 3]} intensity={1.55} color="#fff0d6" />
          <directionalLight position={[2, 1, -1]} intensity={.8} color="#d1dfff" />
          <Suspense fallback={null}>
            <ClockPlanet />
            <ClockResident celebration={celebration} />
          </Suspense>
        </Canvas>
      </SceneBoundary>
      <div className="clock-pet-face" ref={face}>
        <span>{stage}</span>
        <output role="timer" aria-label="浮動剩餘時間">{display}</output>
      </div>
      <div className="clock-pet-controls">
        <button type="button" onClick={() => onCommand(timer.running ? "pause" : "start")}>
          <Icon name={timer.running ? "pause" : "play"} />
          {timer.running ? "暫停" : timer.started ? "繼續" : "開始"}
        </button>
        <button type="button" onClick={onReturn}><Icon name="orbit" />回到星球</button>
      </div>
    </section>
  );
}
