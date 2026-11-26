import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Bone, Box3, BufferAttribute, Color, Group, MathUtils, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Skeleton, SkinnedMesh, SRGBColorSpace, TextureLoader, Vector3 } from "three";
import type { Action } from "../domain";
import { useWorld } from "../store";
import { blendPose, neutralPose, poseFor } from "./character-animation";

const directory = `${import.meta.env.BASE_URL}models/user-residents/`;
const path = "water.glb?v=smooth-jelly-1";
const expressionPaths = [`${directory}water-blink.jpg`, `${directory}water-smile.jpg`];
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
  const [blinkMap, smileMap] = useLoader(TextureLoader, expressionPaths);
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
    const arms = armJoints.map(([part, x, y, z], i) => {
      const source = model.getObjectByName(`tripo_part_${part}`);
      const joint = new Bone();
      joint.name = `WaterArm${i}`;
      joint.position.set(x, y, z);
      if (!(source instanceof Mesh) || !source.parent) return { joint };
      const geometry = source.geometry.clone();
      const positions = geometry.getAttribute("position");
      const indices = new Uint16Array(positions.count * 4);
      const weights = new Float32Array(positions.count * 4);
      for (let vertex = 0; vertex < positions.count; vertex++) {
        // Keep the cut at the shoulder seated and let the outer fin bend.
        const movable = MathUtils.smoothstep(positions.getX(vertex) * Math.sign(x), .321, .376);
        // Ease the fin into the body at rest so its shoulder cut stays covered.
        positions.setXYZ(vertex, x + (positions.getX(vertex) - x) * .92 - Math.sign(x) * .008,
          y + (positions.getY(vertex) - y) * .92 - .008, positions.getZ(vertex));
        const slot = vertex * 4;
        indices[slot + 1] = 1;
        weights[slot] = 1 - movable;
        weights[slot + 1] = movable;
      }
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometry.setAttribute("skinIndex", new BufferAttribute(indices, 4));
      geometry.setAttribute("skinWeight", new BufferAttribute(weights, 4));
      const arm = new SkinnedMesh(geometry, source.material);
      arm.name = source.name;
      const shoulder = new Bone();
      shoulder.add(joint);
      arm.add(shoulder);
      const skeleton = new Skeleton([shoulder, joint]);
      arm.bind(skeleton);
      source.parent.add(arm);
      source.removeFromParent();
      return { joint, geometry, skeleton };
    });
    const feet = footJoints.map(([part, x, y, z], i) => pivot(`WaterFoot${i}`, part, x, y, z));
    const drop = pivot("WaterDrop", 1, .031, .71, .012);
    const blink = { value: 0 }, smile = { value: 0 };
    for (const texture of [blinkMap, smileMap]) {
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = false;
      texture.needsUpdate = true;
    }
    const materials: MeshPhysicalMaterial[] = [];
    model.traverse(object => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const isBody = object.name === "tripo_part_0";
      const isDrop = object.name === "tripo_part_1";
      const jelly = new MeshPhysicalMaterial({
        color: isBody ? "#ffffff" : "#a5d9ed",
        map: isBody ? object.material.map : null,
        metalness: 0, roughness: .32, ior: 1.36,
        clearcoat: .75, clearcoatRoughness: .23, specularIntensity: .72,
        sheen: .12, sheenColor: "#b4f3ff", sheenRoughness: .58,
      });
      if (isBody || isDrop) {
        jelly.onBeforeCompile = shader => {
          shader.vertexShader = "varying vec3 waterSurface;\n" + shader.vertexShader.replace(
            "#include <begin_vertex>", "#include <begin_vertex>\nwaterSurface = position;");
          shader.fragmentShader = "varying vec3 waterSurface;\n" + shader.fragmentShader;
          if (isDrop) {
            shader.uniforms.dropTip = { value: new Color("#c5eaa2") };
            shader.fragmentShader = "uniform vec3 dropTip;\n" + shader.fragmentShader.replace(
              "#include <color_fragment>",
              "#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, dropTip, smoothstep(.76, .93, waterSurface.y));");
            return;
          }
          Object.assign(shader.uniforms, {
            waterBlinkMap: { value: blinkMap }, waterSmileMap: { value: smileMap },
            waterBlink: blink, waterSmile: smile,
            waterBlue: { value: new Color("#94d1ed") }, waterLight: { value: new Color("#c2e9f5") },
          });
          shader.fragmentShader = shader.fragmentShader.replace("#include <map_pars_fragment>", `
            #include <map_pars_fragment>
            uniform sampler2D waterBlinkMap;
            uniform sampler2D waterSmileMap;
            uniform float waterBlink;
            uniform float waterSmile;
            uniform vec3 waterBlue;
            uniform vec3 waterLight;
            float faceMask(vec2 center, vec2 radius) {
              return 1.0 - smoothstep(.72, 1.0, length((waterSurface.xy - center) / radius));
            }
          `).replace("#include <map_fragment>", `
            vec3 face = mix(texture2D(map, vMapUv).rgb, texture2D(waterSmileMap, vMapUv).rgb, waterSmile);
            face = mix(face, texture2D(waterBlinkMap, vMapUv).rgb, waterBlink);
            float eyes = max(faceMask(vec2(-.126,.502),vec2(.039,.044)), faceMask(vec2(.116,.501),vec2(.040,.044)));
            float mouth = faceMask(vec2(-.008,.448),vec2(.062,.044));
            float front = smoothstep(.13,.19,waterSurface.z);
            vec3 gel = mix(waterBlue, waterLight, smoothstep(.08,.68,waterSurface.y));
            float feature = front * max(eyes * (1.0-smoothstep(.15,.48,face.g)), mouth * (1.0-smoothstep(.45,.64,face.g)));
            diffuseColor.rgb *= mix(gel, face, feature);
          `);
        };
        jelly.customProgramCacheKey = () => isBody ? "water-clean-face" : "water-drop-gradient";
      }
      object.material = jelly;
      materials.push(jelly);
    });
    return { model, arms, feet, drop, blink, smile, materials, center: bounds.getCenter(new Vector3()), floor: bounds.min.y };
  }, [scene, blinkMap, smileMap]);
  useEffect(() => () => {
    asset.materials.forEach(material => material.dispose());
    asset.arms.forEach(arm => {
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
    asset.drop.rotation.set(lag * .10, 0, lag * .14 + p.antenna * .53 + Math.sin(t * 2.4 - .8) * .036 * energy);
    asset.drop.scale.set(1 - lag * .030, 1 + lag * .074, 1 - lag * .030);
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
