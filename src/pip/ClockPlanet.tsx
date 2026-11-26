import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { useWorld } from "../store";
import { clockHandTurns, clockRingAxis, clockRingCenter, clockRingYaw } from "./clock-path";

const modelPath = `${import.meta.env.BASE_URL}models/pip/clock-planet.glb?v=moving-parts-1`;
const dialPivot = new Vector3(-.002, .414, .26);
const ringPivot = new Vector3(...clockRingCenter);
const ringNormal = new Vector3(...clockRingAxis).normalize();

function addPivot(scene: Group, name: string, center: Vector3) {
  const part = scene.getObjectByName(name);
  const parent = part?.parent;
  if (!part || !parent) return;
  const pivot = new Group();
  pivot.name = `${name}-pivot`;
  pivot.position.copy(center);
  parent.add(pivot);
  pivot.add(part);
  part.position.sub(center);
  return pivot;
}

export function ClockPlanet() {
  const ringTime = useRef(0);
  const { scene } = useLoader(GLTFLoader, modelPath);
  const model = useMemo(() => {
    const copy = scene.clone(true);
    return {
      scene: copy,
      ring: addPivot(copy, "clock-ring", ringPivot),
      hour: addPivot(copy, "clock-hour", dialPivot),
      minute: addPivot(copy, "clock-minute", dialPivot),
    };
  }, [scene]);

  useFrame((_, delta) => {
    const { timer, reduced } = useWorld.getState();
    const turns = clockHandTurns(timer, Date.now());
    if (model.minute) model.minute.rotation.z = -turns.minute * 2 * Math.PI;
    if (model.hour) model.hour.rotation.z = -turns.hour * 2 * Math.PI;
    if (model.ring && !reduced) {
      ringTime.current += Math.min(delta, .1);
      model.ring.rotation.set(0, clockRingYaw(ringTime.current), 0);
      model.ring.rotateOnAxis(ringNormal, ringTime.current * .29);
    }
  });

  return <primitive object={model.scene} />;
}
