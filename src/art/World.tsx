import { Suspense, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "../store";
import { PlanetArchitecture } from "./PlanetArchitecture";
import { configureLandmarkNavigation } from "./terrain";
import { surfaceMaps } from "./materials";
import { ReadingStation } from "./Furniture";
export function World() {
  const id = useWorld((s) => s.planetId);
  useLayoutEffect(()=>configureLandmarkNavigation(id),[id]);
  const maps = useMemo(
    () => ({
      soil: surfaceMaps("soil"),
      wood: surfaceMaps("wood"),
      cloth: surfaceMaps("cloth"),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(maps).forEach((item) => {
        item.map.dispose();
        item.normalMap.dispose();
      });
    },
    [maps],
  );
  return (
    <group name="CompanionPlanet">
      <Suspense fallback={null}><PlanetArchitecture id={id} /></Suspense>
      <ReadingStation wood={maps.wood} suppliedWorld={id} />


    </group>
  );
}
export function ArtLights({ pet = false }: { pet?: boolean }) {
  const night = useWorld(s => s.night) && !pet;
  const { gl } = useThree();
  const last = useRef(-1);
  const ambient = useRef<THREE.AmbientLight>(null),
    hemisphere = useRef<THREE.HemisphereLight>(null);
  useFrame((_s, delta) => {
    const on = useWorld.getState().lampOn;
    if (ambient.current)
      ambient.current.intensity = THREE.MathUtils.damp(
        ambient.current.intensity,
        night ? (on ? .13 : .19) : on ? 0.32 : 0.44,
        3,
        Math.min(delta, 0.1),
      );
    if (hemisphere.current)
      hemisphere.current.intensity = THREE.MathUtils.damp(
        hemisphere.current.intensity,
        night ? (on ? .26 : .34) : on ? 0.55 : 0.68,
        3,
        Math.min(delta, 0.1),
      );
  });
  useFrame((state) => {
    gl.shadowMap.autoUpdate = false;
    if (state.clock.elapsedTime - last.current > 0.4) {
      gl.shadowMap.needsUpdate = true;
      last.current = state.clock.elapsedTime;
    }
  });
  return (
    <>
      <ambientLight ref={ambient} intensity={0.4} />
      <hemisphereLight ref={hemisphere} args={["#e6dfe9", "#b3b19a", 0.6]} />
      <directionalLight
        name="KeyLight"
        position={[-3.5, 6, 4.5]}
        intensity={night ? .42 : 1.6}
        color={night ? "#b5c9ef" : "#fff3df"}
        castShadow={!pet}
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-far={16}
        shadow-normalBias={0.025}
        shadow-bias={-0.00015}
        shadow-radius={5}
      />
      <directionalLight
        name="FillLight"
        position={[4, 2.5, 2]}
        intensity={night ? .24 : .65}
        color="#cbdce8"
      />
      <directionalLight
        name="RimLight"
        position={[-1, 4, -4]}
        intensity={night ? .5 : .9}
        color="#ffe2bb"
      />
    </>
  );
}
