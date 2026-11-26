import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { Bone, Box3, Euler, Material, MathUtils, MeshStandardMaterial, Quaternion, SkinnedMesh, Vector3 } from "three";
import { useWorld } from "../store";
import type { Action } from "../domain";
import { blendPose, neutralPose, poseFor } from "./character-animation";

const path = "models/user-residents/fern.glb";
const leafChains = [
  ["sprout.1", "sprout.2", "sprout.3"],
  ["branch.L.1", "branch.L.2", "branch.L.3"],
  ["branch.R.1", "branch.R.2", "branch.R.3"],
];

export function SuppliedFern({ action, still, held, time, gaitTime, seatBlend, pet, poseTime }: {
  action: Action;
  still?: boolean;
  held?: RefObject<boolean>;
  time: RefObject<number>;
  gaitTime?: RefObject<number>;
  seatBlend?: RefObject<number>;
  pet?: boolean;
  poseTime?: number;
}) {
  const gltf = useLoader(GLTFLoader, import.meta.env.BASE_URL + path);
  const { gl } = useThree();
  const pose = useRef({ ...neutralPose });
  const seated = useRef(0);
  const leafPhase = useRef(0);
  const face = useRef({ eyes: 1, mouth: 1, width: 1 });
  const scratch = useMemo(() => ({ euler: new Euler(), rotation: new Quaternion() }), []);
  const asset = useMemo(() => {
    const scene = clone(gltf.scene);
    const materials: MeshStandardMaterial[] = [];
    const joints = new Map<string, { bone: Bone; position: Vector3; rotation: Quaternion; scale: Vector3 }>();
    scene.traverse((object) => {
      if (object instanceof Bone) {
        joints.set(object.name, {
          bone: object,
          position: object.position.clone(),
          rotation: object.quaternion.clone(),
          scale: object.scale.clone(),
        });
      }
      if (object instanceof SkinnedMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = false;
        const soften = (source: Material) => {
          if (!(source instanceof MeshStandardMaterial)) return source;
          const material = source.clone();
          material.metalness = 0;
          material.roughnessMap = null;
          material.roughness = .53;
          material.normalScale.multiplyScalar(.65);
          materials.push(material);
          return material;
        };
        object.material = Array.isArray(object.material)
          ? object.material.map(soften)
          : soften(object.material);
      }
    });
    scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(scene, true);
    const center = bounds.getCenter(new Vector3());
    const scale = 1.57 / bounds.getSize(new Vector3()).y;
    return { scene, joints, materials, scale, offset: [-center.x * scale, -bounds.min.y * scale, -center.z * scale] as const };
  }, [gltf]);

  useEffect(() => () => asset.materials.forEach(material => material.dispose()), [asset]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, .05);
    const grabbed = held?.current === true;
    const world = useWorld.getState();
    const t = poseTime ?? time.current;
    const target = still ? neutralPose : poseFor(grabbed ? "listen" : action, t, gaitTime?.current ?? t);
    const p = blendPose(pose.current, target, dt);
    seated.current = MathUtils.damp(seated.current, action === "read" && !pet && !grabbed ? seatBlend?.current ?? 0 : 0, 10, dt);
    const sit = seated.current;

    const turn = (name: string, x: number, y: number, z: number) => {
      const joint = asset.joints.get(name);
      if (!joint) return;
      scratch.rotation.setFromEuler(scratch.euler.set(x, y, z));
      joint.bone.quaternion.copy(joint.rotation).premultiply(scratch.rotation);
    };
    const move = (name: string, x: number, y: number) => {
      const joint = asset.joints.get(name);
      if (!joint) return;
      joint.bone.position.copy(joint.position);
      joint.bone.position.x += x;
      joint.bone.position.y += y;
    };
    move("root", 0, p.lift * .72);
    move("body", .009 * sit, -.038 * sit - (action === "rest" ? .014 : 0));
    turn("body", p.roll * .7, p.yaw * .35, -p.pitch * .65 - sit * .043);
    turn("head", p.roll * .38, p.yaw * .5, -sit * .10);
    for (const [index, side] of ["L", "R"].entries()) {
      const sign = index === 0 ? 1 : -1;
      const swing = index === 0 ? p.leftArmSwing : p.rightArmSwing;
      const leg = index === 0 ? p.leftLeg : p.rightLeg;
      const lift = index === 0 ? p.leftFootLift : p.rightFootLift;
      turn(`arm.${side}`, sign * (p.armRaise * .58 + .06 * sit), 0, swing * .48 + p.armForward * .55 + .13 * sit);
      move(`foot.${side}`, leg * .095 * (1 - sit) + .066 * sit, lift * .62 * (1 - sit));
      turn(`foot.${side}`, 0, 0, leg * .32 * (1 - sit) + .26 * sit);
    }

    const mood = !still && Date.now() < world.reactionUntil ? world.tapMood : null;
    const eyes = mood === "sleepy" ? .23 : mood === "surprise" ? 1.14 : p.eyeOpen;
    face.current.eyes = MathUtils.damp(face.current.eyes, eyes * (1 - p.happyEyes * .45), 20, dt);
    face.current.mouth = MathUtils.damp(face.current.mouth, 1 + p.mouthOpen * .55, 12, dt);
    face.current.width = MathUtils.damp(face.current.width, 1 + (p.smile - .15) * .14, 12, dt);
    for (const name of ["eye.L", "eye.R", "mouth"]) {
      const joint = asset.joints.get(name);
      if (!joint) continue;
      joint.bone.scale.copy(joint.scale);
      joint.bone.scale.z *= name === "mouth" ? face.current.mouth : face.current.eyes;
      if (name === "mouth") joint.bone.scale.x *= face.current.width;
    }

    // Tip sections follow each branch root with a slight phase lag.
    if (!still) leafPhase.current += dt * (world.reduced ? .55 : 1.7);
    const wind = still ? 0 : (world.reduced ? .45 : 1) * (1 + p.lift * 3);
    for (const [chain, names] of leafChains.entries()) {
      for (const [section, name] of names.entries()) {
        const phase = leafPhase.current + chain * 1.24 - section * .53;
        const weight = wind * (.042 + section * .026);
        turn(name, Math.sin(phase) * weight, Math.sin(phase * 1.21) * weight * .44,
          Math.cos(phase * .81) * weight + p.antenna * weight);
      }
    }
    gl.domElement.dataset.modelReady = "user-fern";
    gl.domElement.dataset.modelPath = path;
    gl.domElement.dataset.companion = "fern";
    gl.domElement.dataset.seatedPose = sit.toFixed(3);
    gl.domElement.dataset.leafPhase = leafPhase.current.toFixed(3);
  });

  return <group name="SuppliedFern" position={asset.offset} scale={asset.scale}>
    <primitive object={asset.scene} />
  </group>;
}
