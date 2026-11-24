import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
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
  time,
  seatBlend,
  modelUrl = import.meta.env.BASE_URL + "models/nebula-sculpt.glb",
}: {
  action: Action;
  time: React.RefObject<number>;
  modelUrl?: string;
  seatBlend?: React.RefObject<number>;
}) {
  const gltf = useLoader(GLTFLoader, modelUrl);
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
    const skin = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      vertexColors: true,
      roughness: look.surfaceRoughness,
      metalness: 0,
      ior: 1.2,
      specularIntensity: 0.38,
      clearcoat: 0.08,
      clearcoatRoughness: 0.55,
      opacity: look.materialOpacity,
      transparent: look.materialOpacity < 0.99,
    });
    skin.onBeforeCompile = (shader) => {
      shader.uniforms.uSoftness = { value: look.subsurfaceAppearance };
      shader.fragmentShader =
        "uniform float uSoftness;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `float softRim=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),3.0);\noutgoingLight+=vec3(0.12,0.19,0.23)*softRim*uSoftness;\n#include <opaque_fragment>`,
      );
    };
    skin.customProgramCacheKey = () =>
      `nebula-soft-skin-${look.subsurfaceAppearance}`;
    const antennaSkin = skin.clone();
    antennaSkin.vertexColors = false;
    antennaSkin.color.set("#96bfd6");
    antennaSkin.onBeforeCompile = skin.onBeforeCompile;
    antennaSkin.customProgramCacheKey = skin.customProgramCacheKey;
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = false;
        if (object.name === "Body") object.material = skin;
        else if (object.name.includes("Antenna")) object.material = antennaSkin;
      }
    });
    for (const side of ["Left", "Right"]) {
      const eye = controls[side + "Eye"];
      eye.node.position.x = eye.position.x * look.eyeSpacing;
    }
    const bodyMesh = scene.getObjectByName("Body") as THREE.SkinnedMesh;
    if (bodyMesh.morphTargetDictionary?.Seated === undefined)
      throw Error("Missing seated corrective");
    return { scene, controls, skin, antennaSkin, bodyMesh };
  }, [gltf.scene]);
  useEffect(() => {
    gl.domElement.dataset.modelReady = "sculpt-v1";
    gl.domElement.dataset.characterNodes = CHARACTER_NODES.join(",");
    return () => {
      asset.skin.dispose();
      asset.antennaSkin.dispose();
    };
  }, [asset, gl]);
  useFrame((_state, delta) => {
    const p = blendPose(pose.current, poseFor(action, time.current), delta);
    const c = asset.controls;
    const rotate = (control: Control, x = 0, y = 0, z = 0) => {
      control.node.quaternion.copy(control.rotation);
      control.node.quaternion.multiply(q.setFromAxisAngle(control.x, x));
      control.node.quaternion.multiply(q.setFromAxisAngle(control.y, y));
      control.node.quaternion.multiply(q.setFromAxisAngle(control.z, z));
    };
    asset.bodyMesh.morphTargetInfluences![
      asset.bodyMesh.morphTargetDictionary!.Seated
    ] = Math.max(p.seated, seatBlend?.current || 0);
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
        Math.sin(time.current * 1.8 - 0.35) * 0.025,
        0,
        sign * (p.antenna + Math.sin(time.current * 1.8 - 0.7) * 0.025),
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
    </group>
  );
}
useLoader.preload(
  GLTFLoader,
  import.meta.env.BASE_URL + "models/nebula-sculpt.glb",
);
