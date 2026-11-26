import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3, MathUtils } from "three";
import { SearchBar3D } from "./SearchBar3D";
import type { SearchPlanetState } from "./useSearchPlanetState";

export const searchPlanetSlot = [12, 60] as const;
const ease = (value: number) => MathUtils.smoothstep(value, 0, 1);

export function SearchPlanet3D({ state, reduced, onReady }: {
  state: SearchPlanetState;
  reduced: boolean;
  onReady: () => void;
}) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/search/planet.glb`);
  const { model, center, upper, lower } = useMemo(() => {
    const model = scene.clone();
    return {
      model,
      center: new Box3().setFromObject(model).getCenter(new Vector3()).negate(),
      upper: model.getObjectByName("tripo_part_1"),
      lower: model.getObjectByName("tripo_part_0"),
    };
  }, [scene]);
  const root = useRef<Group>(null);
  const bar = useRef<Group>(null);
  const progress = useRef(0);
  const ready = useRef(false);
  const ray = useMemo(() => new Vector3(), []);

  useFrame(({ camera, size, clock }, delta) => {
    if (!root.current || !bar.current) return;
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    const { phase } = state;
    const target = phase === "closed" || phase === "closing" ? 0 : 1;
    progress.current = MathUtils.clamp(progress.current + (target ? 1 : -1) * Math.min(delta, 0.17) / (reduced ? .22 : 1.05), 0, 1);
    const t = progress.current;
    const travel = ease(t / .7);
    const shell = ease((t - .2) / .45);
    const emerge = ease((t - .49) / .51);
    const depth = MathUtils.lerp(camera.position.length() + 28, 3, travel);
    const x = MathUtils.lerp(searchPlanetSlot[0] / 100, .5, travel);
    const y = MathUtils.lerp(searchPlanetSlot[1] / 100, .315, travel);
    ray.set(x * 2 - 1, 1 - y * 2, .5).unproject(camera);
    ray.sub(camera.position).normalize();
    root.current.position.copy(camera.position).addScaledVector(ray, depth);
    root.current.quaternion.copy(camera.quaternion);
    const halfViewHeight = .384 * depth;
    const diameter = MathUtils.lerp(74, Math.min(180, size.width * .4, size.height * .23), travel);
    root.current.scale.setScalar(diameter * 2 * halfViewHeight / size.height);
    if (upper) {
      upper.position.y = shell * .37;
      upper.rotation.z = shell * -.16;
    }
    if (lower) lower.position.y = shell * -.13;
    const modelView = root.current.children[0];
    modelView.rotation.y = (1 - shell) * (reduced ? 0 : Math.sin(clock.elapsedTime * .65) * .19);

    const barWidth = Math.min(440, size.width * .77);
    const restY = -(size.height * (.53 - .315)) / diameter;
    bar.current.position.set(0, restY * emerge, .35 * emerge);
    bar.current.scale.setScalar(Math.max(.001, emerge * barWidth / diameter));
    bar.current.visible = emerge > 0;

    if (phase === "opening" && t === 1) state.opened();
    if (phase === "closing" && t === 0) state.closed();
  });

  return (
    <group ref={root}>
      <group>
        <group position={center}><primitive object={model} /></group>
      </group>
      <SearchBar3D ref={bar} />
    </group>
  );
}
