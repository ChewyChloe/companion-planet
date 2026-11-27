import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box3, Group, InstancedMesh, MathUtils, Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";
import type { Action } from "../domain";
import { useWorld } from "../store";
import { blendPose, neutralPose, poseFor } from "./character-animation";

const path = "models/user-residents/puff.glb?v=soft-joins-2";
const stem = new Vector3(.052, .746, 0);
const crownParts = [0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const seedCount = 24;
const nextBreeze = () => MathUtils.randFloat(25, 45);

export function SuppliedPuff({ action, time, gaitTime, still, held, seatBlend, pet, poseTime, floatingStage }: {
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
  const { scene } = useLoader(GLTFLoader, import.meta.env.BASE_URL + path);
  const body = useRef<Group>(null);
  const seeds = useRef<InstancedMesh>(null);
  const pose = useRef({ ...neutralPose });
  const breeze = useRef({ age: 0, next: 0 });
  const seed = useMemo(() => new Object3D(), []);
  const asset = useMemo(() => {
    const model = scene.clone(true);
    const bounds = new Box3().setFromObject(model);
    const find = (part: number) => model.getObjectByName(`tripo_part_${part}`);
    const mount = (joint: Group, part: number) => {
      model.add(joint);
      const mesh = find(part);
      if (mesh) joint.attach(mesh);
      return joint;
    };
    const limb = (name: string, part: number, x: number, y: number, z: number) => {
      const joint = new Group();
      joint.name = name;
      joint.position.set(x, y, z);
      return mount(joint, part);
    };
    const arms = [limb("PuffLeftArm", 3, -.315, .351, .027), limb("PuffRightArm", 2, .313, .351, .020)];
    arms[0].position.x += .014;
    arms[1].position.x -= .014;
    const feet = [limb("PuffLeftFoot", 4, -.132, .086, -.027), limb("PuffRightFoot", 5, .136, .092, .024)];
    const head = new Group();
    head.name = "PuffDandelion";
    head.position.copy(stem);
    model.add(head);
    const crown = crownParts.map((part, index) => {
      const mesh = find(part);
      const origin = mesh ? new Box3().setFromObject(mesh).getCenter(new Vector3()) : stem;
      const joint = new Group();
      joint.position.copy(origin).sub(stem);
      head.add(joint);
      if (mesh) joint.attach(mesh);
      const angle = index * 2.399963;
      return { joint, base: joint.position.clone(), dx: Math.cos(angle), dz: Math.sin(angle) };
    });
    const face = find(1);
    const blink = { value: 0 }, smile = { value: 0 }, happy = { value: 0 };
    const materials: MeshStandardMaterial[] = [];
    model.traverse(object => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
      object.castShadow = true;
      const material = object.material.clone();
      material.metalness = 0;
      material.roughness = .54;
      if (!crownParts.some(part => object.name === `tripo_part_${part}`)) {
        material.normalMap = null;
        material.map = null;
        material.color.set(object === face ? "#ffffff" : "#deb78d");
      }
      object.material = material;
      materials.push(material);
      if (object !== face) return;
      material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, { puffBlink: blink, puffSmile: smile, puffHappy: happy });
        shader.vertexShader = "varying vec3 puffSurface;\n" + shader.vertexShader.replace(
          "#include <begin_vertex>", "#include <begin_vertex>\npuffSurface = position;");
        shader.fragmentShader = `
          varying vec3 puffSurface;
          uniform float puffBlink;
          uniform float puffSmile;
          uniform float puffHappy;
          float puffOval(vec2 p, vec2 r) {
            return 1.0 - smoothstep(.88, 1.0, length(p / r));
          }
          float puffEye(vec2 p, float close) {
            p.y -= close * .007 * (1.0 - pow(clamp(abs(p.x / .027), 0.0, 1.0), 2.0));
            vec2 openRadius = mix(vec2(.027,.032), vec2(.041), puffHappy);
            return puffOval(p, mix(openRadius, vec2(.024,.0035), close));
          }
        ` + shader.fragmentShader.replace("#include <map_fragment>", `
          #include <map_fragment>
          vec2 face = puffSurface.xy;
          float front = smoothstep(.14,.20,puffSurface.z);
          float close = puffBlink * (1.0 - puffHappy);
          vec3 fur = mix(vec3(.73,.49,.28), vec3(.91,.70,.46), smoothstep(.09,.64,puffSurface.y));
          float blush = max(puffOval(face - vec2(-.181,.429),vec2(.047,.037)),
            puffOval(face - vec2(.184,.426),vec2(.047,.037)));
          diffuseColor.rgb = mix(fur,vec3(.90,.34,.19),front * blush * .38);
          vec2 left = face - vec2(-.111,.481);
          vec2 right = face - vec2(.114,.481);
          float eyes = front * max(puffEye(left,close), puffEye(right,close));
          float shine = (1.0 - close) * max(puffOval(left - vec2(-.007,.010),vec2(.006,.008)),
            puffOval(right - vec2(-.007,.010),vec2(.006,.008)));
          vec3 ink = mix(vec3(.025,.012,.010),vec3(.29,.21,.15),shine);
          vec2 mouth = face - vec2(-.002,.444);
          mouth.y -= .009 * pow(clamp(abs(mouth.x / .037), 0.0, 1.0), 2.0);
          diffuseColor.rgb = mix(mix(diffuseColor.rgb,ink,eyes),vec3(.22,.075,.066),
            front * puffOval(mouth,vec2(.037,mix(.006,.018,puffSmile))));
        `);
      };
      material.customProgramCacheKey = () => "puff-round-eyes";
    });
    return { model, arms, feet, head, crown, blink, smile, happy, materials, center: bounds.getCenter(new Vector3()), floor: bounds.min.y };
  }, [scene]);
  useEffect(() => () => asset.materials.forEach(material => material.dispose()), [asset]);

  useFrame(({ gl }, delta) => {
    const dt = Math.min(delta, .08);
    const t = poseTime ?? time.current;
    const movement = still || held?.current ? "idle" : action;
    const p = blendPose(pose.current, still ? neutralPose : poseFor(movement, t, gaitTime?.current ?? t), dt);
    const reduced = useWorld.getState().reduced;
    const sway = still ? 0 : reduced ? .35 : 1;
    const seated = !pet && movement === "read" ? seatBlend?.current ?? 0 : 0;
    if (body.current) {
      body.current.scale.set(1 / Math.sqrt(p.scaleY), p.scaleY, 1 / Math.sqrt(p.scaleY));
      const extraHop = Math.max(0, Math.sin(t * 5)) * .19 * p.happyEyes;
      body.current.position.y = p.lift * .78 + extraHop * sway - seated * .028;
      body.current.rotation.set(p.pitch * .65, p.yaw * .55, p.roll * .72);
    }
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const swing = i === 0 ? p.leftArmSwing : p.rightArmSwing;
      const wave = floatingStage && i === 1 && movement === "stretch" ? Math.sin(t * 16) * .18 : 0;
      asset.arms[i].rotation.set(swing * .66 - p.armForward, 0, side * (.05 + p.armRaise * .43 + wave));
      const stride = i === 0 ? p.leftLeg : p.rightLeg;
      const lift = i === 0 ? p.leftFootLift : p.rightFootLift;
      asset.feet[i].rotation.x = stride * .54 * (1 - seated) - .22 * seated;
      asset.feet[i].position.y = (i === 0 ? .086 : .092) + lift * (1 - seated);
    }
    asset.blink.value = 1 - MathUtils.smoothstep(p.eyeOpen, .16, .80);
    asset.smile.value = Math.max(p.happyEyes, p.mouthOpen);
    asset.happy.value = p.happyEyes;

    const event = breeze.current;
    if (!event.next) event.next = nextBreeze();
    if (!still && !reduced && !held?.current) event.age += dt;
    let phase = !still && !reduced ? event.age - event.next : -1;
    if (phase >= 7.65) {
      event.next += nextBreeze();
      phase = -1;
    }
    const spread = MathUtils.smoothstep(phase, 0, 2.28);
    const rejoin = MathUtils.smoothstep(phase, 5.45, 7.65);
    const distance = spread * (1 - rejoin);
    const size = 1 - MathUtils.smoothstep(phase, .40, 2.28) * (1 - rejoin);
    const head = asset.head;
    const shake = Math.sin(t * 6.4 - .9) * .36 * p.happyEyes;
    head.rotation.set((Math.sin(t * 1.57) * .073 + shake * .60) * sway, 0,
      (Math.sin(t * 1.76 - .3) * .10 + p.antenna * .25 + shake) * sway);
    head.position.y = stem.y + Math.sin(t * 2.05) * .008 * sway;
    for (const [i, part] of asset.crown.entries()) {
      part.joint.visible = size > .015;
      part.joint.position.set(part.base.x + part.dx * distance * .40,
        part.base.y + distance * .17 + Math.sin(t * 2.1 - i * .36) * .007 * sway,
        part.base.z + part.dz * distance * .40);
      part.joint.rotation.set(Math.sin(t * 1.68 - i) * .065 * sway + distance * .6, distance * part.dx, distance * part.dz);
      part.joint.scale.setScalar(size);
    }

    if (seeds.current) {
      const fading = MathUtils.smoothstep(phase, 0, .42) * (1 - MathUtils.smoothstep(phase, 2.85, 4.35));
      seeds.current.visible = fading > .015;
      if (seeds.current.visible) {
        const travel = MathUtils.smoothstep(phase, 0, 4.35);
        for (let i = 0; i < seedCount; i++) {
          const angle = i * 2.399963;
          const reach = .27 + (i % 6) * .115;
          seed.position.set(Math.cos(angle) * (.08 + reach * travel),
            .13 + (i % 5) * .02 + travel * (.12 + (i % 4) * .035),
            Math.sin(angle) * (.08 + reach * travel));
          seed.rotation.set(travel * 3 + i, travel * 2, angle);
          seed.scale.setScalar(fading * (.68 + (i % 4) * .16));
          seed.updateMatrix();
          seeds.current.setMatrixAt(i, seed.matrix);
        }
        seeds.current.instanceMatrix.needsUpdate = true;
      }
    }
    gl.domElement.dataset.modelReady = "user-puff";
    gl.domElement.dataset.modelPath = path;
    gl.domElement.dataset.companion = "puff";
    gl.domElement.dataset.puffCrown = size.toFixed(3);
  });

  return (
    <group ref={body} name="SuppliedPuff">
      <group scale={1.43}>
        <group position={[-asset.center.x, -asset.floor, -asset.center.z]}>
          <primitive object={asset.model} />
          <instancedMesh ref={seeds} args={[undefined, undefined, seedCount]} position={stem} visible={false} frustumCulled={false}>
            <sphereGeometry args={[.012, 6, 4]} />
            <meshBasicMaterial color="#fff0cf" />
          </instancedMesh>
        </group>
      </group>
    </group>
  );
}
