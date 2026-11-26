import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Bone, Box3, BufferAttribute, Group, MathUtils, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Skeleton, SkinnedMesh, Vector3 } from "three";
import type { Action } from "../domain";
import { useWorld } from "../store";
import { blendPose, neutralPose, poseFor } from "./character-animation";

const directory = `${import.meta.env.BASE_URL}models/user-residents/`;
const path = "water.glb?v=sealed-jelly-2";
const armJoints = [[3, -.307, .417, .048], [5, .298, .431, .093]] as const;
const footJoints = [[2, -.150, .098, 0], [4, .154, .097, 0]] as const;

export function SuppliedWater({ action, time, gaitTime, still, held, seatBlend, pet, poseTime, floatingStage }: {
  action: Action;
  time: RefObject<number>;
  gaitTime?: RefObject<number>;
  still?: boolean;
  held?: RefObject<boolean>;
  seatBlend?: RefObject<number>;
  pet?: boolean;
  poseTime?: number;
  floatingStage?: boolean;
}) {
  const { scene } = useLoader(GLTFLoader, directory + path);
  const body = useRef<Group>(null);
  const pose = useRef({ ...neutralPose });
  const step = useRef(0);
  const asset = useMemo(() => {
    const model = scene.clone(true);
    const bounds = new Box3().setFromObject(model);
    const pivot = (name: string, part: number, x: number, y: number, z: number) => {
      const joint = new Group();
      joint.name = name;
      joint.position.set(x, y, z);
      model.add(joint);
      const item = model.getObjectByName(`tripo_part_${part}`);
      if (item) joint.attach(item);
      return joint;
    };
    const skinPart = (name: string, part: number, x: number, y: number, z: number, isStem = false) => {
      const source = model.getObjectByName(`tripo_part_${part}`);
      const joint = new Bone();
      joint.name = name;
      joint.position.set(x, y, z);
      if (!(source instanceof Mesh) || !source.parent) return { joint };
      const geometry = source.geometry.clone();
      const positions = geometry.getAttribute("position");
      const indices = new Uint16Array(positions.count * 4);
      const weights = new Float32Array(positions.count * 4);
      for (let vertex = 0; vertex < positions.count; vertex++) {
        const px = positions.getX(vertex), py = positions.getY(vertex);
        // The joined edge follows the body; only the outer portion bends.
        const movable = isStem
          ? MathUtils.smoothstep(py, .748, .86)
          : MathUtils.smoothstep(px * Math.sign(x), .321, .376);
        if (isStem) {
          positions.setY(vertex, py - .025 * (1 - MathUtils.smoothstep(py, .718, .80)));
        } else {
          const inset = .009 + .020 * (1 - movable);
          positions.setXYZ(vertex, x + (px - x) * .92 - Math.sign(x) * inset,
            y + (py - y) * .92 - .008, positions.getZ(vertex));
        }
        const slot = vertex * 4;
        indices[slot + 1] = 1;
        weights[slot] = 1 - movable;
        weights[slot + 1] = movable;
      }
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometry.setAttribute("skinIndex", new BufferAttribute(indices, 4));
      geometry.setAttribute("skinWeight", new BufferAttribute(weights, 4));
      const skin = new SkinnedMesh(geometry, source.material);
      skin.name = source.name;
      const base = new Bone();
      base.add(joint);
      skin.add(base);
      const skeleton = new Skeleton([base, joint]);
      skin.bind(skeleton);
      source.parent.add(skin);
      source.removeFromParent();
      return { joint, geometry, skeleton };
    };
    const arms = armJoints.map(([part, x, y, z], i) => skinPart(`WaterArm${i}`, part, x, y, z));
    const feet = footJoints.map(([part, x, y, z], i) => pivot(`WaterFoot${i}`, part, x, y, z));
    const drop = skinPart("WaterDrop", 1, .031, .748, .012, true);
    const blink = { value: 0 }, smile = { value: 0 };
    const materials: MeshPhysicalMaterial[] = [];
    model.traverse(object => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const jelly = new MeshPhysicalMaterial({
        color: "#ffffff", metalness: 0, roughness: .32, ior: 1.36,
        clearcoat: .75, clearcoatRoughness: .23, specularIntensity: .72,
        sheen: .12, sheenColor: "#b4f3ff", sheenRoughness: .58,
      });
      jelly.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, { waterBlink: blink, waterSmile: smile });
        shader.vertexShader = "varying vec3 waterSurface;\n" + shader.vertexShader.replace(
          "#include <begin_vertex>", "#include <begin_vertex>\nwaterSurface = position;");
        shader.fragmentShader = `
          varying vec3 waterSurface;
          uniform float waterBlink;
          uniform float waterSmile;
          float waterOval(vec2 p, vec2 radius) {
            return 1.0 - smoothstep(.90, 1.0, length(p / radius));
          }
          float waterEye(vec2 p, float close) {
            p.y -= close * .008 * (1.0 - pow(clamp(abs(p.x / .028), 0.0, 1.0), 2.0));
            return waterOval(p, vec2(mix(.026,.024,close), mix(.031,.0035,close)));
          }
        ` + shader.fragmentShader.replace("#include <color_fragment>", `
          #include <color_fragment>
          vec3 gel = mix(vec3(.30,.63,.84), vec3(.54,.78,.89), smoothstep(.08,.68,waterSurface.y));
          gel = mix(gel, vec3(.53,.77,.36), smoothstep(.79,.97,waterSurface.y));
          vec2 face = waterSurface.xy;
          float close = max(waterBlink, waterSmile * .38);
          vec2 leftEye = face - vec2(-.126,.502);
          vec2 rightEye = face - vec2(.116,.501);
          float front = smoothstep(.13,.19,waterSurface.z);
          float eyes = front * max(waterEye(leftEye,close), waterEye(rightEye,close));
          float shine = (1.0 - close) * max(waterOval(leftEye - vec2(-.007,.010),vec2(.006,.009)),
            waterOval(rightEye - vec2(-.007,.010),vec2(.006,.009)));
          vec3 ink = mix(vec3(.006,.015,.027),vec3(.24,.42,.57),shine);
          vec2 lip = face - vec2(-.008,.448);
          lip.y -= .008 * pow(clamp(abs(lip.x / .043), 0.0, 1.0), 2.0);
          float mouth = front * waterOval(lip,vec2(.042,mix(.011,.022,waterSmile)));
          vec3 insideMouth = mix(vec3(.22,.093,.120),vec3(.15,.055,.074),smoothstep(-.012,.015,lip.y));
          diffuseColor.rgb *= mix(mix(gel,ink,eyes),insideMouth,mouth);
        `);
      };
      jelly.customProgramCacheKey = () => "water-gel-features";
      object.material = jelly;
      materials.push(jelly);
    });
    return { model, arms, feet, drop, blink, smile, materials, center: bounds.getCenter(new Vector3()), floor: bounds.min.y };
  }, [scene]);
  useEffect(() => () => {
    asset.materials.forEach(material => material.dispose());
    [...asset.arms, asset.drop].forEach(arm => {
      arm.geometry?.dispose();
      arm.skeleton?.dispose();
    });
  }, [asset]);

  useFrame(({ gl }, delta) => {
    const dt = Math.min(delta, .08);
    const t = poseTime ?? time.current;
    const gait = gaitTime?.current ?? t;
    const movement = still || held?.current ? "idle" : action;
    const walking = movement === "walk" || movement === "approach" || movement === "return";
    const p = blendPose(pose.current, still ? neutralPose : poseFor(movement, t, gait), dt);
    const energy = still ? 0 : useWorld.getState().reduced ? .42 : 1;
    step.current = MathUtils.damp(step.current, walking ? 1 : 0, 10, dt);
    const cycle = gait * 7.1;
    const rebound = Math.sin(cycle * 2 - .55) * step.current;
    const breath = Math.sin(t * 2.4) * .013;
    const stretch = p.scaleY + (breath + rebound * .047) * energy;
    const width = 1 / Math.sqrt(stretch);
    const seated = !pet && movement === "read" ? seatBlend?.current ?? 0 : 0;
    if (body.current) {
      body.current.scale.set(width, stretch, width);
      body.current.rotation.set(p.pitch * .55, p.yaw * .6, p.roll * .85);
      body.current.position.y = p.lift * .70 - seated * .025;
    }
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      const armSwing = i === 0 ? p.leftArmSwing : p.rightArmSwing;
      const wave = floatingStage && i === 1 && movement === "stretch" ? Math.sin(t * 16) * .16 : 0;
      asset.arms[i].joint.rotation.set(armSwing * .72 - p.armForward, side * armSwing * .12, side * (1.24 - p.armRaise * 1.15 + wave));
      const stride = i === 0 ? p.leftLeg : p.rightLeg;
      const lift = i === 0 ? p.leftFootLift : p.rightFootLift;
      asset.feet[i].rotation.x = stride * .52 * (1 - seated) - .24 * seated;
      asset.feet[i].position.y = footJoints[i][2] + lift * .96 * (1 - seated);
      asset.feet[i].position.z = -stride * .065 + seated * .028;
    }
    const lag = Math.sin(cycle * 2 - 1.3) * step.current * energy;
    asset.drop.joint.rotation.set(lag * .10, 0, lag * .14 + p.antenna * .53 + Math.sin(t * 2.4 - .8) * .036 * energy);
    asset.drop.joint.scale.set(1 - lag * .030, 1 + lag * .074, 1 - lag * .030);
    asset.blink.value = 1 - MathUtils.smoothstep(p.eyeOpen, .18, .72);
    asset.smile.value = Math.max(p.happyEyes, p.mouthOpen);
    gl.domElement.dataset.modelReady = "user-water";
    gl.domElement.dataset.modelPath = `models/user-residents/${path}`;
    gl.domElement.dataset.companion = "water";
  });

  return (
    <group ref={body} name="SuppliedWater">
      <group scale={1.43}>
        <primitive object={asset.model} position={[-asset.center.x, -asset.floor, -asset.center.z]} />
      </group>
    </group>
  );
}
