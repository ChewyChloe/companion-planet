import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Box3, Group, MathUtils, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Action } from "../domain";
import { useWorld } from "../store";
import { blendPose, neutralPose, poseFor } from "./character-animation";

const path = "models/user-residents/aurora.glb";

export function SuppliedAurora({ action, time, poseTime, still, held }: {
  action: Action;
  time: RefObject<number>;
  poseTime?: number;
  still?: boolean;
  held?: RefObject<boolean>;
}) {
  const { scene } = useLoader(GLTFLoader, import.meta.env.BASE_URL + path);
  const actor = useRef<Group>(null);
  const posture = useRef({ ...neutralPose });
  const asset = useMemo(() => {
    const model = scene.clone(true);
    const bounds = new Box3().setFromObject(model);
    const materials: MeshPhysicalMaterial[] = [];
    const motion = {
      auroraTime: { value: 0 },
      auroraFlow: { value: 0 },
      auroraClose: { value: 0 },
      auroraSmile: { value: 0 },
    };
    model.traverse(object => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
      const material = new MeshPhysicalMaterial({
        map: object.material.map,
        side: object.material.side,
        roughness: .43,
        clearcoat: .46,
        clearcoatRoughness: .34,
        sheen: .35,
        sheenColor: "#b4d8ff",
        sheenRoughness: .57,
      });
      material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, motion);
        shader.vertexShader = `
          uniform float auroraTime;
          uniform float auroraFlow;
          uniform float auroraClose;
          uniform float auroraSmile;
          float auroraWeight(vec2 p,vec2 center,vec2 radius) {
            return 1.0-smoothstep(.42,1.0,length((p-center)/radius));
          }
        ` + shader.vertexShader.replace("#include <begin_vertex>", `
          #include <begin_vertex>
          // Use the same motion field for all exported parts so shared edges travel together.
          float ribbon = smoothstep(.20,.47,abs(position.x));
          float tail = 1.0-smoothstep(.025,.29,position.y);
          float crest = smoothstep(.77,.98,position.y);
          float wave = sin(auroraTime*2.1 - position.x*7.0 - position.y*3.0);
          transformed.y += auroraFlow*ribbon*wave*.033;
          transformed.z += auroraFlow*ribbon*cos(auroraTime*1.7+position.x*8.0)*.039;
          transformed.x += auroraFlow*(tail*.045+crest*.023)*wave;
          transformed.z += auroraFlow*(tail*.029+crest*.015)*cos(auroraTime*1.9-position.y*5.0);

          // Bend the original painted features along with the mesh.
          float front = smoothstep(.075,.155,position.z);
          vec2 leftEye = vec2(-.107,.669);
          vec2 rightEye = vec2(.060,.644);
          float left = auroraWeight(position.xy,leftEye,vec2(.041,.052));
          float right = auroraWeight(position.xy,rightEye,vec2(.041,.052));
          transformed.y -= front*auroraClose*(left*(position.y-leftEye.y)+right*(position.y-rightEye.y))*.82;
          vec2 smileCenter = vec2(-.028,.63);
          float smile = auroraSmile*front*auroraWeight(position.xy,smileCenter,vec2(.039,.034));
          transformed.xy += smile*(position.xy-smileCenter)*vec2(.38,.25);
        `);
        shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", `
          #include <emissivemap_fragment>
          totalEmissiveRadiance += diffuseColor.rgb * .16;
        `);
      };
      material.customProgramCacheKey = () => "aurora-flow-and-expressions";
      object.material = material;
      materials.push(material);
    });
    return { model, materials, motion, center: bounds.getCenter(new Vector3()),
      floor: bounds.min.y, scale: 1.42 / bounds.getSize(new Vector3()).y };
  }, [scene]);
  useEffect(() => () => asset.materials.forEach(material => material.dispose()), [asset]);

  useFrame(({ gl }, delta) => {
    const t = poseTime ?? time.current;
    const active = still || held?.current ? "idle" : action;
    const pose = blendPose(posture.current, still ? neutralPose : poseFor(active, t), delta);
    const { reduced, timer } = useWorld.getState();
    const focus = active === "read" || (active === "idle" && timer.running && timer.phase === "focus");
    const resting = active === "rest";
    const energy = still || held?.current ? 0 : reduced ? .38 : 1;
    const flow = energy * (resting ? .36 : focus ? .55 : 1 + pose.happyEyes * .45);
    const { auroraTime, auroraFlow, auroraClose, auroraSmile } = asset.motion;
    auroraTime.value = t;
    auroraFlow.value = MathUtils.damp(auroraFlow.value, flow, 5, delta);
    const eyeClose = Math.max(1 - pose.eyeOpen, pose.happyEyes * .76, focus ? .42 : 0);
    auroraClose.value = MathUtils.damp(auroraClose.value, eyeClose, 21, delta);
    auroraSmile.value = pose.happyEyes;
    if (actor.current) {
      const target = resting ? .022 : .065 + Math.sin(t * 2.2) * .028 * energy + pose.lift * .56;
      actor.current.position.y = MathUtils.damp(actor.current.position.y, target, 9, delta);
      actor.current.scale.y = pose.scaleY;
      actor.current.rotation.set(pose.pitch * .7, pose.yaw * .85, pose.roll + .027 * flow * Math.sin(t * 1.7));
    }
    gl.domElement.dataset.modelReady = "user-aurora";
    gl.domElement.dataset.modelPath = path;
    gl.domElement.dataset.companion = "aurora";
  });

  return (
    <group ref={actor} name="SuppliedAurora">
      <group scale={asset.scale}>
        <primitive object={asset.model} position={[-asset.center.x, -asset.floor, -asset.center.z]} />
      </group>
    </group>
  );
}
