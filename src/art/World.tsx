import { useWorld } from "../store";
import { planetFor } from "../planets";
import { PlanetGarden } from "./PlanetGarden";
import { Grass } from "./Grass";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  createRockGeometry,
  createShoreGeometry,
  createSoilGeometry,
  groundHeight,
  noise3,
} from "./terrain";
import { surfaceMaps } from "./materials";
import { ReadingStation, RestArea } from "./Furniture";
function SmallPlants() {
  const stems = useRef<THREE.InstancedMesh>(null),
    leaves = useRef<THREE.InstancedMesh>(null);
  const stemGeometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.025, 0.3, 0),
          new THREE.Vector3(0.08, 0.65, 0.02),
        ]),
        12,
        0.009,
        6,
        false,
      ),
    [],
  );
  const leafGeometry = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 12, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + 1) * 0.5;
      p.setXYZ(
        i,
        p.getX(i) * 0.075,
        t * 0.29,
        p.getZ(i) * 0.03 + Math.sin(t * Math.PI) * 0.028 + t * t * 0.035,
      );
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const locations = [
    [-1.9, -0.9],
    [-1.45, -1.6],
    [-0.7, -1.95],
    [0.2, -2.02],
    [1.1, -1.8],
    [1.8, -1.2],
    [2.02, -0.5],
    [-2.0, 0.55],
  ];
  useLayoutEffect(() => {
    if (!stems.current || !leaves.current) return;
    const dummy = new THREE.Object3D(),
      color = new THREE.Color();
    let n = 0;
    locations.forEach(([x, z], i) => {
      const s = 0.7 + (i % 3) * 0.15;
      const y = groundHeight(x, z);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, i * 0.78, 0);
      dummy.scale.set(1, s, 1);
      dummy.updateMatrix();
      stems.current!.setMatrixAt(i, dummy.matrix);
      for (let row = 0; row < 3; row++)
        for (const side of [-1, 1]) {
          dummy.position.set(x + 0.02, y + (row * 0.16 + 0.14) * s, z);
          dummy.rotation.set(
            0.1,
            i * 0.78 + side * 0.4,
            -side * (0.75 + row * 0.08),
          );
          dummy.scale.setScalar(s * (1 - row * 0.14));
          dummy.updateMatrix();
          leaves.current!.setMatrixAt(n, dummy.matrix);
          color.set(
            n % 3 === 0 ? "#92a17b" : n % 3 === 1 ? "#778d70" : "#a3ae82",
          );
          leaves.current!.setColorAt(n++, color);
        }
    });
    stems.current.instanceMatrix.needsUpdate = true;
    leaves.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group name="SmallPlants">
      <instancedMesh ref={stems} args={[stemGeometry, undefined, 8]} castShadow>
        <meshStandardMaterial color="#78866b" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={leaves}
        args={[leafGeometry, undefined, 48]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial roughness={0.78} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}
function Rocks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 20, 14);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const n = 0.9 + noise3(x * 3, y * 3, z * 3) * 0.15;
      p.setXYZ(i, x * n, y * n * 0.67, z * n * 0.9);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const points = [
    [-1.8, -0.25, 0.26],
    [1.8, 0.2, 0.3],
    [1.55, -1.4, 0.24],
    [-1.85, 1.15, 0.14],
    [1.8, 1.3, 0.16],
    [-0.15, -1.85, 0.2],
    [-1.7, 0.05, 0.1],
    [1.55, 0.5, 0.09],
    [-0.6, 1.85, 0.11],
  ];
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D(),
      color = new THREE.Color();
    points.forEach(([x, z, s], i) => {
      dummy.position.set(x, groundHeight(x, z) + s * 0.3, z);
      dummy.scale.setScalar(s);
      dummy.rotation.set(0.1, i * 2.1, 0.1);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
      color.set(i % 2 ? "#a1a59a" : "#8e9794");
      ref.current!.setColorAt(i, color);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh
      name="Rocks"
      ref={ref}
      args={[geometry, undefined, points.length]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial roughness={0.94} />
    </instancedMesh>
  );
}
export function World({ shoreline = false }: { shoreline?: boolean }) {
  const id = useWorld((s) => s.planetId);
  const theme = planetFor(id);
  const rockGeometry = useMemo(
      () => (shoreline ? createShoreGeometry() : createRockGeometry()),
      [shoreline],
    ),
    soilGeometry = useMemo(
      () =>
        createSoilGeometry(
          id === "rose"
            ? { base: "#c9b2b4", moss: "#b5bda1" }
            : id === "moon"
              ? { base: "#c5c4d6", moss: "#aeb9c3" }
              : id === "forest"
                ? { base: "#a9b7a5", moss: "#7d9c8a" }
                : undefined,
        ),
      [id],
    );
  const maps = useMemo(
    () => ({
      rock: surfaceMaps("rock"),
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
      rockGeometry.dispose();
      soilGeometry.dispose();
    },
    [maps, rockGeometry, soilGeometry],
  );
  return (
    <group name="CompanionPlanet">
      <mesh name="TerrainRock" geometry={rockGeometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          normalMap={maps.rock.normalMap}
          normalScale={new THREE.Vector2(0.12, 0.12)}
          roughness={0.94}
        />
      </mesh>
      <mesh
        name="Soil"
        geometry={soilGeometry}
        receiveShadow
        onClick={(e) => {
          if (e.delta < 6) {
            e.stopPropagation();
            useWorld.getState().goTo(e.point.x, e.point.z);
          }
        }}
      >
        <meshStandardMaterial
          vertexColors
          color={theme.tint}
          normalMap={maps.soil.normalMap}
          normalScale={new THREE.Vector2(0.35, 0.35)}
          roughness={1}
        />
      </mesh>
      <Grass />
      <Rocks />
      <SmallPlants />
      <PlanetGarden />
      <ReadingStation wood={maps.wood} />
      <RestArea cloth={maps.cloth} />
    </group>
  );
}
export function ArtLights({ pet = false }: { pet?: boolean }) {
  const { gl } = useThree();
  const last = useRef(-1);
  const ambient = useRef<THREE.AmbientLight>(null),
    hemisphere = useRef<THREE.HemisphereLight>(null);
  useFrame((_s, delta) => {
    const on = useWorld.getState().lampOn;
    if (ambient.current)
      ambient.current.intensity = THREE.MathUtils.damp(
        ambient.current.intensity,
        on ? 0.32 : 0.44,
        3,
        Math.min(delta, 0.1),
      );
    if (hemisphere.current)
      hemisphere.current.intensity = THREE.MathUtils.damp(
        hemisphere.current.intensity,
        on ? 0.55 : 0.68,
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
        intensity={1.6}
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
        intensity={0.65}
        color="#cbdce8"
      />
      <directionalLight
        name="RimLight"
        position={[-1, 4, -4]}
        intensity={0.9}
        color="#ffe2bb"
      />
    </>
  );
}
