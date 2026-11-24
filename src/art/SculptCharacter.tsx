import { residentModelPath } from "./resident-assets";
import { ResidentInterior } from "./ResidentInterior";
import { NebulaInterior, NebulaTransmissionProbe } from "./NebulaInterior";
import { getNebulaMaterialVariant, nebulaTestMaterial, resolveNebulaMaterial } from "./nebula-material-test";
import { companionSkin } from "./companion-skin";
import { useEffect, useMemo, useRef } from "react";
import {
  useFrame,
  useThree,
  useLoader,
  createPortal,
} from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import { useWorld } from "../store";
import { type CompanionId } from "../companions";
import type { Action } from "../domain";
import look from "../../assets/art/character-look.json";
import { blendPose, neutralPose, poseFor } from "./character-animation";
export const CHARACTER_NODES = [
  "CharacterRoot",
  "Body",
  "Belly",
  "LeftEye",
  "RightEye",
  "Mouth",
  "LeftCheek",
  "RightCheek",
  "LeftAntenna",
  "RightAntenna",
  "LeftArm",
  "RightArm",
  "LeftLeg",
  "RightLeg",
];
interface Control {
  node: THREE.Object3D;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
  position: THREE.Vector3;
  x: THREE.Vector3;
  y: THREE.Vector3;
  z: THREE.Vector3;
}
export default function SculptCharacter({
  action,
  companionId,
  held,
  time,
  seatBlend,
  pet = false,
  still = false,
  modelUrl,
}: {
  action: Action;
  companionId?: CompanionId;
  held?: React.RefObject<boolean>;
  time: React.RefObject<number>;
  modelUrl?: string;
  seatBlend?: React.RefObject<number>;
  pet?: boolean;
  still?: boolean;
}) {
  const selected = useWorld((s) => s.companionId);
  const id = companionId || selected;
  const materialVariant = resolveNebulaMaterial(id);
  const materialPreview = id === "nebula" && !!getNebulaMaterialVariant();
  const freezePose = materialPreview || still;
  const previewModel = residentModelPath(id);
  const gltf = useLoader(GLTFLoader, modelUrl || import.meta.env.BASE_URL + previewModel);
  const { gl } = useThree();
  const pose = useRef({ ...neutralPose });
  const root = useRef<THREE.Group>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const asset = useMemo(() => {
    const scene = clone(gltf.scene);
    scene.updateMatrixWorld(true);
    const controls: Record<string, Control> = {};
    scene.traverse((node) => {
      if (CHARACTER_NODES.includes(node.name) || node.name === "BodyControl" || node.name === `Crown-${id}`) {
        const inverse = node
          .getWorldQuaternion(new THREE.Quaternion())
          .invert();
        controls[node.name] = {
          node,
          rotation: node.quaternion.clone(),
          scale: node.scale.clone(),
          position: node.position.clone(),
          x: new THREE.Vector3(1, 0, 0).applyQuaternion(inverse),
          y: new THREE.Vector3(0, 1, 0).applyQuaternion(inverse),
          z: new THREE.Vector3(0, 0, 1).applyQuaternion(inverse),
        };
      }
    });
    for (const name of CHARACTER_NODES)
      if (!controls[name]) throw Error(`Character asset missing ${name}`);
    // Compare actual transmission on desktop including software WebGL; phones
    // use the same explicit thin-shell fallback as the real application.
    const testThinShell = pet || window.innerWidth < 700 || window.matchMedia("(pointer: coarse)").matches;
    const skin = materialVariant ? nebulaTestMaterial(materialVariant, testThinShell) : companionSkin(id, testThinShell);
    const antennaSkin = skin.clone();
    antennaSkin.vertexColors = false;
    antennaSkin.color.set("#96bfd6");
    antennaSkin.onBeforeCompile = skin.onBeforeCompile;
    antennaSkin.customProgramCacheKey = skin.customProgramCacheKey;
    const faceMaterials: THREE.Material[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = false;
        if (object.name === "Body") {
          object.material = skin;
          object.geometry = object.geometry.clone();
        } else if ((object.name.includes("EyeSurface") || object.name.includes("Cheek") || object.name === "Mouth")) {
          // Alpha stays one. Sorting the face after transmission keeps its own
          // eyes out of the refraction buffer and prevents ghost pupils.
          const face = (object.material as THREE.MeshStandardMaterial).clone();
          face.transparent = true;
          face.opacity = 1;
          face.depthWrite = true;
          object.renderOrder = 5;
          object.material = face;
          faceMaterials.push(face);
        } else if (object.name.includes("Antenna")) {
          if (object.name.endsWith("Tip")) {
            const tip = antennaSkin.clone();
            tip.emissive.set("#b5ddff");
            tip.emissiveIntensity = 0.4;
            object.material = tip;
            faceMaterials.push(tip);
          } else object.material = antennaSkin;
        } else {
          const m = (object.material as THREE.MeshStandardMaterial).clone();
          m.userData.baseGlow = m.emissiveIntensity;
          object.material = m;
          faceMaterials.push(m);
        }
      }
    });
    for (const side of ["Left", "Right"]) {
      controls[side + "Antenna"].node.visible = id === "nebula";
      const eye = controls[side + "Eye"];
      eye.node.position.x = eye.position.x * look.eyeSpacing;
    }
    const bodyMesh = scene.getObjectByName("Body") as THREE.SkinnedMesh;
    if (bodyMesh.morphTargetDictionary?.Seated === undefined)
      throw Error("Missing seated corrective");
    return {
      scene,
      controls,
      skin,
      antennaSkin,
      bodyMesh,
      faceMaterials,
      interiorMatrix: controls.BodyControl.node.matrixWorld.clone().invert(),
    };
  }, [gltf.scene, id, gl, materialVariant, pet]);
  useEffect(() => {
    gl.domElement.dataset.modelReady = "sculpt-v1";
    gl.domElement.dataset.companion = id;
    gl.domElement.dataset.material = materialVariant || `resident-${id}`;
    gl.domElement.dataset.modelVersion = "approved-sdf-color-v1";
    gl.domElement.dataset.modelPath = previewModel;
    gl.domElement.dataset.materialTest = materialPreview ? materialVariant! : "none";
    gl.domElement.dataset.skinMode = asset.skin.userData.lightweight
      ? "thin-shell"
      : "transmission";
    gl.domElement.dataset.characterNodes = CHARACTER_NODES.join(",");
    return () => {
      asset.bodyMesh.geometry.dispose();
      asset.faceMaterials.forEach((m) => m.dispose());
      asset.skin.dispose();
      asset.antennaSkin.dispose();
    };
  }, [asset, gl, id, materialVariant, materialPreview, previewModel]);
  useFrame((_state, delta) => {
    asset.skin.userData.clock.value = materialVariant || freezePose ? 0 : time.current;
    const animationTime = freezePose ? 1 : time.current;
    const desired = freezePose ? { ...neutralPose, armRaise: 0, eyeOpen: 1 } : poseFor(action, time.current);
    if (id === "water") {
      desired.scaleY = 1 + (desired.scaleY - 1) * 1.6;
      desired.roll *= 1.25;
    }
    if (id === "blossom" && action === "idle") {
      desired.armForward = 0.12;
      desired.armRaise = 0.17;
    }
    if (held?.current)
      Object.assign(desired, {
        seated: 0,
        pitch: -0.12,
        roll: Math.sin(time.current * 3) * 0.06,
        armRaise: 0.22,
        armForward: 0,
        leftLeg: 0.12,
        rightLeg: -0.12,
        lift: 0,
      });
    const p = freezePose ? Object.assign(pose.current, desired) : blendPose(pose.current, desired, delta);
    const c = asset.controls;
    const rotate = (control: Control, x = 0, y = 0, z = 0) => {
      control.node.quaternion.copy(control.rotation);
      control.node.quaternion.multiply(q.setFromAxisAngle(control.x, x));
      control.node.quaternion.multiply(q.setFromAxisAngle(control.y, y));
      control.node.quaternion.multiply(q.setFromAxisAngle(control.z, z));
    };
    asset.bodyMesh.morphTargetInfluences![
      asset.bodyMesh.morphTargetDictionary!.Seated
    ] = held?.current ? 0 : Math.max(p.seated, seatBlend?.current || 0);
    const body = c.BodyControl;
    rotate(body, p.pitch, p.yaw, p.roll);
    body.node.scale.copy(body.scale);
    body.node.scale.y *= p.scaleY;
    if (root.current) root.current.position.y = p.lift;
    for (const [side, sign] of [
      ["Left", -1],
      ["Right", 1],
    ] as const) {
      rotate(
        c[side + "Arm"],
        -1.25 * p.armForward,
        -sign * p.armForward,
        sign * p.armRaise,
      );
      c[side + "Arm"].node.position.copy(c[side + "Arm"].position);
      c[side + "Arm"].node.position.z += p.armForward * 0.62;
      c[side + "Arm"].node.position.y += p.armForward * 0.3;
      c[side + "Arm"].node.position.x -= sign * p.armForward * 0.3;
      rotate(c[side + "Leg"], side === "Left" ? p.leftLeg : p.rightLeg);
      const eye = c[side + "Eye"];
      eye.node.scale.copy(eye.scale);
      eye.node.scale.x *= look.eyeScale;
      eye.node.scale.y *= look.eyeScale * p.eyeOpen;
      const antenna = c[side + "Antenna"];
      rotate(
        antenna,
        Math.sin(animationTime * 1.8 - 0.35) * 0.025,
        0,
        sign * (p.antenna + Math.sin(animationTime * 1.8 - 0.7) * 0.025),
      );
      antenna.node.scale.copy(antenna.scale);
      antenna.node.scale.y *= look.antennaLength;
    }
    if (c[`Crown-${id}`]) rotate(c[`Crown-${id}`], 0, 0, Math.sin(animationTime * .8) * .025);
    for (const m of asset.faceMaterials) {
      if (m instanceof THREE.MeshStandardMaterial && m.userData.baseGlow)
        m.emissiveIntensity = m.userData.baseGlow * (.9 + .1 * Math.sin(animationTime * 1.6));
    }
    gl.domElement.dataset.pose = Object.values(p)
      .map((n) => n.toFixed(4))
      .join(",");
  });
  return (
    <group ref={root} scale={[look.bodyWidth, look.bodyHeight, 1]}>
      <primitive object={asset.scene} />
      {materialVariant && createPortal(
        <group matrixAutoUpdate={false} matrix={asset.interiorMatrix}>
          <NebulaInterior variant={materialVariant} />
        </group>, asset.controls.BodyControl.node,
      )}
      {materialVariant && new URLSearchParams(location.search).has("material-probe") && <NebulaTransmissionProbe />}
      {id !== "nebula" && createPortal(
        <group matrixAutoUpdate={false} matrix={asset.interiorMatrix}>
          <ResidentInterior id={id} />
        </group>, asset.controls.BodyControl.node,
      )}

    </group>
  );
}
