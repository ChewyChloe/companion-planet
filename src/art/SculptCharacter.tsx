import { NebulaInterior, NebulaTransmissionProbe } from "./NebulaInterior";
import { getNebulaMaterialVariant, nebulaTestMaterial } from "./nebula-material-test";
import { companionSkin, shouldUseThinShell } from "./companion-skin";
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
import { companionFor, type CompanionId } from "../companions";
import { CompanionCrown } from "./CompanionCrown";
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
  modelUrl,
}: {
  action: Action;
  companionId?: CompanionId;
  held?: React.RefObject<boolean>;
  time: React.RefObject<number>;
  modelUrl?: string;
  seatBlend?: React.RefObject<number>;
}) {
  const selected = useWorld((s) => s.companionId);
  const id = companionId || selected;
  const species = companionFor(id);
  const materialVariant = id === "nebula" ? getNebulaMaterialVariant() : undefined;
  const previewModel = materialVariant ? "models/material-preview/nebula.glb" : "models/nebula-sculpt.glb";
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
      if (CHARACTER_NODES.includes(node.name) || node.name === "BodyControl") {
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
    const context = gl.getContext(),
      debug = context.getExtension("WEBGL_debug_renderer_info");
    const renderer = debug
      ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL))
      : "";
    const lightweight = shouldUseThinShell(
      window.innerWidth,
      window.matchMedia("(pointer: coarse)").matches,
      renderer,
    );
    // Compare actual transmission on desktop including software WebGL; phones
    // use the same explicit thin-shell fallback as the real application.
    const testThinShell = window.innerWidth < 700 || window.matchMedia("(pointer: coarse)").matches;
    const skin = materialVariant ? nebulaTestMaterial(materialVariant, testThinShell) : companionSkin(id, lightweight);
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
          if (id !== "nebula") {
            const colors = object.geometry.getAttribute("color");
            const positions = object.geometry.getAttribute("position");
            const base = new THREE.Color(species.color),
              accent = new THREE.Color(species.accent),
              shade = new THREE.Color();
            for (let i = 0; i < colors.count; i++) {
              const x = positions.getX(i),
                y = positions.getY(i),
                z = positions.getZ(i);
              const cloud =
                (Math.sin(x * 13 + y * 9) + Math.sin(z * 17 - y * 11)) * 0.12 +
                0.24;
              shade
                .copy(base)
                .lerp(accent, id === "stardust" ? cloud * 0.06 : cloud)
                .multiplyScalar(0.85 + colors.getZ(i) * 0.3);
              colors.setXYZ(i, shade.r, shade.g, shade.b);
            }
          }
        } else if (materialVariant && (object.name.includes("EyeSurface") || object.name.includes("Cheek") || object.name === "Mouth")) {
          // Alpha stays one. Sorting the face after transmission keeps its own
          // eyes out of the refraction buffer and prevents ghost pupils.
          const face = (object.material as THREE.MeshStandardMaterial).clone();
          face.transparent = true;
          face.opacity = 1;
          face.depthWrite = true;
          object.renderOrder = 5;
          object.material = face;
          faceMaterials.push(face);
        } else if (
          id !== "nebula" &&
          (object.name.includes("EyeSurface") ||
            object.name.includes("Cheek") ||
            object.name === "Mouth")
        ) {
          const material = (
            object.material as THREE.MeshStandardMaterial
          ).clone();
          if (object.name.includes("EyeSurface")) {
            material.color.set(id === "stardust" ? "#f1d493" : "#28353a");
            if (id === "stardust") {
              material.emissive.set("#d3ac65");
              material.emissiveIntensity = 0.15;
            }
          } else
            material.color.set(
              object.name.includes("Cheek")
                ? id === "fern"
                  ? "#99af72"
                  : "#c99799"
                : "#946c78",
            );
          object.material = material;
          faceMaterials.push(material);
        } else if (object.name.includes("Antenna")) {
          if (object.name.endsWith("Tip")) {
            const tip = antennaSkin.clone();
            tip.emissive.set("#b5ddff");
            tip.emissiveIntensity = 0.4;
            object.material = tip;
            faceMaterials.push(tip);
          } else object.material = antennaSkin;
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
    const marks: THREE.Vector3[] = [];
    if (id === "water") {
      scene.updateMatrixWorld(true);
      bodyMesh.skeleton.update();
      for (const [x, y] of [
        [-0.19, 0.5],
        [0.13, 0.57],
        [-0.08, 0.37],
        [0.23, 0.39],
        [0.03, 0.65],
        [-0.27, 0.68],
      ]) {
        const ray = new THREE.Raycaster(
          new THREE.Vector3(x, y, 2),
          new THREE.Vector3(0, 0, -1),
        );
        const hit = ray.intersectObject(bodyMesh, false)[0];
        if (hit) {
          hit.point.z += 0.008;
          marks.push(controls.BodyControl.node.worldToLocal(hit.point.clone()));
        }
      }
    }
    return {
      scene,
      controls,
      skin,
      antennaSkin,
      bodyMesh,
      faceMaterials,
      marks,
    };
  }, [gltf.scene, id, species, gl, materialVariant]);
  useEffect(() => {
    gl.domElement.dataset.modelReady = "sculpt-v1";
    gl.domElement.dataset.companion = id;
    gl.domElement.dataset.materialTest = materialVariant || "none";
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
  }, [asset, gl, id, materialVariant]);
  useFrame((_state, delta) => {
    asset.skin.userData.clock.value = materialVariant ? 0 : time.current;
    const animationTime = materialVariant ? 1 : time.current;
    const desired = materialVariant ? { ...neutralPose, armRaise: 0, eyeOpen: 1 } : poseFor(action, time.current);
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
    const p = materialVariant ? Object.assign(pose.current, desired) : blendPose(pose.current, desired, delta);
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
    gl.domElement.dataset.pose = Object.values(p)
      .map((n) => n.toFixed(4))
      .join(",");
  });
  return (
    <group ref={root} scale={[look.bodyWidth, look.bodyHeight, 1]}>
      <primitive object={asset.scene} />
      {materialVariant && <NebulaInterior variant={materialVariant} />}
      {materialVariant && new URLSearchParams(location.search).has("material-probe") && <NebulaTransmissionProbe />}
      {id === "water" &&
        createPortal(
          <group name="WaterBubbleMarks">
            {asset.marks.map((p, i) => (
              <mesh key={i} position={p}>
                <ringGeometry args={[0.025, 0.031, 20]} />
                <meshStandardMaterial
                  color="#bce5eb"
                  roughness={0.4}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ))}
          </group>,
          asset.controls.BodyControl.node,
        )}
      {id !== "nebula" &&
        createPortal(
          <CompanionCrown id={id} />,
          asset.controls.BodyControl.node,
        )}
    </group>
  );
}
useLoader.preload(
  GLTFLoader,
  import.meta.env.BASE_URL + "models/nebula-sculpt.glb",
);
