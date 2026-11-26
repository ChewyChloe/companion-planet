import { useMemo, useRef, type RefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box3, Group, MathUtils, Mesh, Vector3 } from "three";
import type { Action } from "../domain";
import { useWorld } from "../store";
import { blendPose, neutralPose, poseFor } from "./character-animation";

const path = "models/user-residents/mushroom.glb";
// The supplied mesh faces -X. These pivots use that mesh's source coordinates.
const arms = [[10, .26], [9, -.255]] as const;
const feet = [[4, .15], [5, -.15]] as const;
const caps = [
  { parts: [0], point: [-.006, .687, .004], delay: .42 },
  { parts: [1, 3], point: [-.025, .525, -.138], delay: .94 },
  { parts: [6, 7], point: [-.025, .525, .150], delay: 1.42 },
] as const;

export function SuppliedMushroom({ action, still, held, time, gaitTime, seatBlend, pet, poseTime }: {
  action: Action;
  still?: boolean;
  held?: RefObject<boolean>;
  time: RefObject<number>;
  gaitTime?: RefObject<number>;
  seatBlend?: RefObject<number>;
  pet?: boolean;
  poseTime?: number;
}) {
  const { scene } = useLoader(GLTFLoader, import.meta.env.BASE_URL + path);
  const pose = useRef({ ...neutralPose });
  const stepAmount = useRef(0);
  const asset = useMemo(() => {
    const model = scene.clone();
    const bounds = new Box3().setFromObject(model);
    const center = bounds.getCenter(new Vector3());
    const pivot = (name: string, point: readonly [number, number, number], parts: readonly number[]) => {
      const joint = new Group();
      joint.name = name;
      joint.position.set(...point);
      model.add(joint);
      for (const index of parts) {
        const mesh = model.getObjectByName(`tripo_part_${index}`);
        if (mesh) joint.attach(mesh);
      }
      return joint;
    };
    const arm = arms.map(([part, z], i) => pivot(`MushroomArm${i}`, [-.118, .268, z], [part]));
    const foot = feet.map(([part, z], i) => pivot(`MushroomFoot${i}`, [-.073, .073, z], [part]));
    const cap = caps.map(({ point, parts }, i) => pivot(`MushroomCap${i}`, point, parts));
    const eyes = [[11, -.121], [13, .131]].map(([part, z], i) => pivot(`MushroomEye${i}`, [-.264, .327, z], [part]));
    model.traverse(object => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    const scale = 1.43 / bounds.getSize(new Vector3()).y;
    return { model, center, floor: bounds.min.y, scale, arm, foot, cap, eyes };
  }, [scene]);
  const body = useRef<Group>(null);

  useFrame(({ gl }, delta) => {
    const dt = Math.min(delta, .05);
    const grabbed = held?.current === true;
    const t = poseTime ?? time.current;
    const gait = gaitTime?.current ?? t;
    const movement = still || grabbed ? "idle" : action;
    const walking = movement === "walk" || movement === "approach" || movement === "return";
    const p = blendPose(pose.current, still ? neutralPose : poseFor(movement, t, gait), dt);
    stepAmount.current = MathUtils.damp(stepAmount.current, walking ? 1 : 0, 13, dt);
    const energy = useWorld.getState().reduced ? .45 : 1;
    const sit = !pet && movement === "read" ? seatBlend?.current ?? 0 : 0;
    if (body.current) {
      body.current.scale.y = p.scaleY;
      body.current.position.y = p.lift * .65 - sit * .035;
      body.current.rotation.set(p.pitch * .65, p.yaw * .55, p.roll * .55);
    }
    for (const [i, arm] of asset.arm.entries()) {
      const side = i === 0 ? 1 : -1;
      arm.rotation.x = side * (p.armRaise * .5 + .07 * sit);
      arm.rotation.z = (i === 0 ? p.leftArmSwing : p.rightArmSwing) * .68 - .18 * sit - p.armForward;
      const stride = i === 0 ? p.leftLeg : p.rightLeg;
      const lift = i === 0 ? p.leftFootLift : p.rightFootLift;
      asset.foot[i].rotation.z = stride * .45 * (1 - sit) + .16 * sit;
      asset.foot[i].position.x = -.073 + stride * .095 * (1 - sit) - .035 * sit;
      asset.foot[i].position.y = .073 + lift * .85 * (1 - sit);
    }
    for (const [i, cap] of asset.cap.entries()) {
      const { point, delay } = caps[i];
      const step = gait * 14.2 - delay;
      const bounce = Math.sin(step) * stepAmount.current * energy;
      const sway = still ? 0 : Math.sin(t * 1.8 - delay) * .018 * energy;
      const lift = bounce * (i === 0 ? .017 : .012);
      cap.position.y = point[1] + lift;
      cap.rotation.set(bounce * .10 + sway, 0, bounce * .14 + sway + p.antenna * .40);
      cap.scale.set(1 - bounce * .035, 1 + bounce * .095, 1 - bounce * .035);
    }
    for (const eye of asset.eyes) eye.scale.y = Math.max(.12, p.eyeOpen * (1 - p.happyEyes * .55));
    gl.domElement.dataset.modelReady = "user-mushroom";
    gl.domElement.dataset.modelPath = path;
    gl.domElement.dataset.companion = "mushroom";
    gl.domElement.dataset.mushroomCap = asset.cap[0].scale.y.toFixed(4);
    gl.domElement.dataset.mushroomStride = asset.foot[0].position.x.toFixed(4);
  });

  return (
    <group ref={body} name="SuppliedMushroom">
      <group rotation-y={Math.PI / 2} scale={asset.scale}>
        <primitive object={asset.model} position={[-asset.center.x, -asset.floor, -asset.center.z]} />
      </group>
    </group>
  );
}
