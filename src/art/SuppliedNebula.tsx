import { CHAIR, groundHeight } from "./terrain";
import { contactFloor } from "./world-collision";
import { useWorld } from "../store";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import type { Action } from "../domain";

export const SUPPLIED_NEBULA_URL = "models/user-residents/nebula.glb?v=arms-v2";
export function SuppliedNebula({ action, still, held, seatBlend, pet = false }: {
  action: Action; still?: boolean; held?: React.RefObject<boolean>; seatBlend?: React.RefObject<number>; pet?: boolean;
}) {
  const gltf = useLoader(GLTFLoader, import.meta.env.BASE_URL + SUPPLIED_NEBULA_URL);
  const { gl } = useThree();
  const current = useRef<THREE.AnimationAction | null>(null);
  const root = useRef<THREE.Group>(null);
  const lift = useRef(0);
  const seat = useRef(0);
  const brows = useRef<THREE.Group>(null);
  const vertex = useMemo(()=>new THREE.Vector3(),[]);
  const asset = useMemo(() => {
    const scene = clone(gltf.scene);
    const materials: THREE.Material[] = [];
    scene.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      const copy = (source: THREE.Material) => {
        const m = source.clone() as THREE.MeshPhysicalMaterial;
        // Retain the user's painted face and nebula texture; reduce glassiness.
        m.transmission = pet || window.innerWidth < 700 ? 0 : .22;
        m.roughness = .34;
        m.thickness = .32;
        m.transparent = false;
        m.opacity = 1;
        materials.push(m);
        return m;
      };
      o.material = Array.isArray(o.material) ? o.material.map(copy) : copy(o.material);
    });
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene);
    const scale = 1.50 / bounds.getSize(new THREE.Vector3()).y;
    const center = bounds.getCenter(new THREE.Vector3());
    const contacts: {mesh:THREE.SkinnedMesh,index:number,seat:boolean}[]=[];
    const meshes:THREE.SkinnedMesh[]=[];
    const v=new THREE.Vector3();
    scene.traverse(o=>{
      if(!(o instanceof THREE.SkinnedMesh))return;
      o.skeleton.update();
      meshes.push(o);
      for(let i=0;i<o.geometry.attributes.position.count;i++){
        o.getVertexPosition(i,v);o.localToWorld(v);
        if(v.y<bounds.min.y+ .30*(bounds.max.y-bounds.min.y))
          contacts.push({mesh:o,index:i,seat:v.y<bounds.min.y+.13*(bounds.max.y-bounds.min.y)});
      }
    });
    const feet = ["Foot.L", "Foot.R"].flatMap(name => {
      const bone = scene.getObjectByName(name);
      return bone ? [{ bone, base: bone.position.clone() }] : [];
    });
    const browPoints = [-1,1].map(side => {
      const x = center.x + side * .158;
      const y = bounds.min.y + bounds.getSize(new THREE.Vector3()).y * .584;
      const ray = new THREE.Raycaster(new THREE.Vector3(x,y,bounds.max.z+.5), new THREE.Vector3(0,0,-1));
      const hit = ray.intersectObjects(meshes, false)[0];
      return [x,y,(hit?.point.z ?? bounds.max.z)+.015] as [number,number,number];
    });
    const mixer = new THREE.AnimationMixer(scene);
    const clips = Object.fromEntries(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
    return { scene, scale, offset: [-center.x * scale, -bounds.min.y * scale, -center.z * scale] as [number, number, number], mixer, clips, materials, contacts, meshes, feet, browPoints };
  }, [gltf, pet]);
  useEffect(() => () => {
    asset.mixer.stopAllAction();
    current.current = null;
    asset.materials.forEach(m => m.dispose());
  }, [asset]);
  useEffect(() => {
    const name = action === "walk" || action === "approach" || action === "return" ? "Walk"
      : action === "happy" ? "Bounce" : action === "stretch" || action === "listen" ? "Wave" : "AntennaSway";
    const next = asset.clips[name];
    if (!next || next === current.current) return;
    const previous = current.current;
    next.reset().setEffectiveWeight(1).play();
    if (previous) next.crossFadeFrom(previous, .25, false);
    current.current = next;
  }, [action, asset]);
  useFrame((_, dt) => {
    if (!still && !held?.current) asset.mixer.update(Math.min(dt, .05));
    const targetSeat = !pet && !held?.current && action === "read" ? (seatBlend?.current ?? 0) : 0;
    seat.current = THREE.MathUtils.damp(seat.current, targetSeat, 12, Math.min(dt,.05));
    for (const {bone, base} of asset.feet) {
      // The uploaded rig uses local +X as forward. Bring its feet under the
      // belly while seated, then restore the authored gait on departure.
      if (action === "read" || seat.current > .001) {
        bone.position.copy(base);
        bone.position.x += .105 * seat.current;
        bone.position.y += .085 * seat.current;
      }
    }
    if(root.current && !pet){
      root.current.scale.set(asset.scale*(1+.075*seat.current),asset.scale*(1-.16*seat.current),asset.scale);
      gl.domElement.dataset.seatedPose = seat.current.toFixed(3);
      const seatedOffset = asset.offset[1] - .14 * seat.current;
      root.current.position.y=seatedOffset;
      root.current.updateWorldMatrix(true,true);
      // SkinnedMesh updates its attached bind inverse in updateMatrixWorld.
      root.current.updateMatrixWorld(true);
      let required=0;
      const seated=seat.current>.95;
      const planetId=useWorld.getState().planetId;
      asset.meshes.forEach(mesh=>mesh.skeleton.update());
      for(const {mesh,index,seat} of asset.contacts){
        if(seated && !seat)continue;
        mesh.getVertexPosition(index,vertex);mesh.localToWorld(vertex);
        const hit=seated ? null : contactFloor(planetId,vertex);
        const support=groundHeight(CHAIR.x,CHAIR.z)+CHAIR.seatHeight;
        // Seated feet use the measured seat, rather than standing on a backrest
        // or adjacent raised ledge sampled through the lower belly.
        const floor=seated ? support : hit;
        if(floor!==null)required=Math.max(required,floor-vertex.y+(seated ? .012 : .05));
      }
      lift.current=Math.max(required,THREE.MathUtils.damp(lift.current,required,12,Math.min(dt,.05)));
      const parentScale=root.current.parent?.getWorldScale(vertex).y||1;
      root.current.position.y=seatedOffset+Math.min(.50,lift.current)/parentScale;
      gl.domElement.dataset.footCorrection=lift.current.toFixed(4);
    }
    const { tapMood, reactionUntil } = useWorld.getState();
    const mood = Date.now() < reactionUntil ? tapMood : null;
    const expression = mood ?? (action === "happy" ? "joy" : action === "rest" ? "sad"
      : action === "stretch" ? "surprise" : action === "listen" ? "curious" : "neutral");
    if (root.current) {
      const bow = expression === "sad" || expression === "sleepy" ? -.10 : expression === "annoyed" ? .07 : 0;
      root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, bow, 10, Math.min(dt,.05));
    }
    if (brows.current) {
      brows.current.visible = expression !== "neutral";
      brows.current.children.forEach((brow, i) => {
        const side = i === 0 ? -1 : 1;
        brow.position.y = asset.browPoints[i][1] + (expression === "surprise" ? .038 : expression === "joy" ? .012 : 0);
        brow.rotation.z = side * (expression === "sad" ? -.36 : expression === "annoyed" ? .52 : expression === "curious" ? .24 : expression === "joy" ? .14 : 0);
      });
    }
    gl.domElement.dataset.expression = expression;
    gl.domElement.dataset.modelReady = "user-nebula";
    gl.domElement.dataset.modelPath = SUPPLIED_NEBULA_URL;
    gl.domElement.dataset.companion = "nebula";
    gl.domElement.dataset.suppliedClip = current.current?.getClip().name || "none";
  });
  return <group ref={root} name="SuppliedNebula" position={asset.offset} scale={asset.scale}>
    <primitive object={asset.scene} />
    <group ref={brows} visible={false}>
      {asset.browPoints.map((point,i) => (
        <mesh key={i} position={point} scale={[.046,.009,.010]} raycast={() => null}>
          <sphereGeometry args={[1,12,8]} />
          <meshStandardMaterial color="#284051" roughness={.82} />
        </mesh>
      ))}
    </group>
  </group>;
}
