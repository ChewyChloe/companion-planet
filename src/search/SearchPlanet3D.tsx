import { usesMobileSafariRendering } from "../art/mobile-safari";
import { SceneBoundary } from "../SceneBoundary";
import { Suspense, useMemo, useRef, type RefObject } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3, MathUtils, Scene, OrthographicCamera, MeshBasicMaterial } from "three";
import { SearchBar3D } from "./SearchBar3D";
import { searchMotion } from "./search-motion";
import type { SearchPlanetState } from "./useSearchPlanetState";

export const searchPlanetSlot = [12, 60] as const;

export function SearchPlanet3D({ state, reduced, paused, onReady, overlay }: {
  state: SearchPlanetState;
  reduced: boolean;
  paused: boolean;
  onReady: () => void;
  overlay: RefObject<HTMLDivElement | null>;
}) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/search/planet${usesMobileSafariRendering() ? "-mobile" : ""}.glb`);
  const { model, center, upper, lower } = useMemo(() => {
    const model = scene.clone();
    return {
      model,
      center: new Box3().setFromObject(model).getCenter(new Vector3()).negate(),
      upper: model.getObjectByName("tripo_part_1"),
      lower: model.getObjectByName("tripo_part_0"),
    };
  }, [scene]);
  const foreground = useMemo(() => {
    const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 1800);
    camera.position.z = 1000;
    return { scene: new Scene(), camera, anchor: new Vector3() };
  }, []);
  const root = useRef<Group>(null);
  const bar = useRef<Group>(null);
  const veilMaterial = useRef<MeshBasicMaterial>(null);
  const progress = useRef(0);
  const motionPreference = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)"), []);
  const ready = useRef(false);
  const barError = useRef<Group>(null);

  useFrame(({ gl, size, clock }, delta) => {
    const planet = root.current;
    const searchBar = bar.current;
    if (paused || !planet || !veilMaterial.current) return;
    const { width, height } = size;
    const { camera, anchor } = foreground;
    if (camera.right !== width / 2 || camera.top !== height / 2) {
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
    }
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    const { phase } = state;
    if (phase === "opening" && barError.current) state.close();
    const target = phase === "closed" || phase === "closing" ? 0 : 1;
    const limitMotion = reduced || motionPreference.matches;
    const duration = limitMotion ? .28 : target ? 2 : 1.3;
    progress.current = MathUtils.clamp(progress.current + (target ? 1 : -1) * Math.min(delta, .12) / duration, 0, searchBar ? 1 : .59);
    const { travel, shell, bar: deploy, veil } = searchMotion(progress.current);
    const viewport = window.visualViewport;
    const visibleHeight = Math.min(height, viewport?.height ?? height);
    const viewCenterY = height / 2 - (viewport?.offsetTop ?? 0);
    const planetSize = Math.min(138, width * .34, visibleHeight * .25);
    const planetY = viewCenterY - visibleHeight * .31;
    const panelY = viewCenterY - visibleHeight * .61;

    const controls = overlay.current;
    planet.position.set(MathUtils.lerp(width * (searchPlanetSlot[0] / 100 - .5), 0, travel),
      MathUtils.lerp(height * (.5 - searchPlanetSlot[1] / 100), planetY, travel), 0);
    planet.scale.setScalar(MathUtils.lerp(74, planetSize, travel));
    planet.rotation.y = limitMotion ? 0 : (1 - travel) * Math.sin(clock.elapsedTime * .65) * .15 + travel * -.11;
    if (upper) {
      upper.position.y = shell * .32;
      upper.rotation.z = shell * -.12;
    }
    if (lower) lower.position.y = shell * -.12;

    const panelWidth = Math.min(470, width * .86, visibleHeight * 1.08);
    if (searchBar) {
      searchBar.visible = deploy > 0;
      searchBar.position.set(0, MathUtils.lerp(planetY, panelY, deploy), 300);
      searchBar.scale.setScalar(Math.max(.001, panelWidth * deploy));
      const yaw = limitMotion || !target ? -.08 : -.08 + 2 * Math.PI * (deploy - 1);
      searchBar.rotation.set(MathUtils.lerp(-.36, -.12, deploy), yaw, -.025);
      if (controls && phase === "open") {
        searchBar.updateMatrixWorld(true);
        const form = controls.querySelector<HTMLFormElement>("form");
        anchor.set(.085, 0, .16);
        searchBar.localToWorld(anchor);
        if (form) {
          form.style.left = `${width / 2 + anchor.x}px`;
          form.style.top = `${height / 2 - anchor.y}px`;
          form.style.width = `${panelWidth * .54}px`;
          form.style.height = `${panelWidth * .135}px`;
        }
        const close = controls.querySelector<HTMLButtonElement>(".search-planet-close");
        if (close) {
          close.style.left = `${width / 2 + panelWidth * .41}px`;
          close.style.top = `${height / 2 - panelY - panelWidth * .21}px`;
        }
      }
    }

    veilMaterial.current.opacity = veil * .72;
    veilMaterial.current.visible = veil > 0;
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.clearDepth();
    gl.render(foreground.scene, camera);
    gl.autoClear = autoClear;

    if (phase === "opening" && progress.current === 1) state.opened();
    if (phase === "closing" && progress.current === 0) state.closed();
  }, 2);

  return createPortal(
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[-240, 300, 390]} intensity={2.3} color="#fff1db" />
      <directionalLight position={[210, -30, 190]} intensity={.65} color="#b8c4ff" />
      <mesh position={[0, 0, -500]} scale={[10000, 10000, 1]}>
        <planeGeometry />
        <meshBasicMaterial ref={veilMaterial} color="#1c1737" transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={root}>
        <group position={center}><primitive object={model} /></group>
      </group>
      {state.phase !== "closed" && (
        <SceneBoundary fallback={<group ref={barError} />}>
          <Suspense fallback={null}>
            <SearchBar3D ref={bar} />
          </Suspense>
        </SceneBoundary>
      )}
    </>,
    foreground.scene,
  );
}
