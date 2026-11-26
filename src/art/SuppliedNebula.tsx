import { attachNebulaFace, chooseExpression, expressionPresets, faceUniforms, type Expression, type Face } from "./nebula-expressions";
import { CHAIR, groundHeight } from "./terrain";
import { contactFloor } from "./world-collision";
import { useWorld } from "../store";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import type { Action } from "../domain";

export const SUPPLIED_NEBULA_URL = "models/user-residents/nebula.glb?v=modular-face-4";
export function SuppliedNebula({ action, still, held, seatBlend, gaitTime, face, pet = false }: {
  action: Action; face?: Face; still?: boolean; held?: React.RefObject<boolean>; seatBlend?: React.RefObject<number>; gaitTime?: React.RefObject<number>; pet?: boolean;
}) {
  const gltf = useLoader(GLTFLoader, import.meta.env.BASE_URL + SUPPLIED_NEBULA_URL);
  const { gl } = useThree();
  const current = useRef<THREE.AnimationAction | null>(null);
  const root = useRef<THREE.Group>(null);
  const lift = useRef(0);
  const gaitBlend = useRef(0);
  const swing = useMemo(() => new THREE.Quaternion(), []);
  const seat = useRef(0);
  const reactionStamp = useRef(0);
  const reactionExpression = useRef<Expression | null>(null);
  const faceTime = useRef(0);
  const uniforms = useMemo(faceUniforms, []);
  const renderedFace = useRef<Face>(expressionPresets.calm.face);
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
        attachNebulaFace(m, uniforms);
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
    const limb = (name: string) => {
      const bone = scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
      if (!bone?.parent) return null;
      const parentInverse = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      return {
        bone, base: bone.position.clone(), rotation: bone.quaternion.clone(),
        forward: new THREE.Vector3(0, 0, 1).applyQuaternion(parentInverse),
        up: new THREE.Vector3(0, 1, 0).applyQuaternion(parentInverse),
        sideways: new THREE.Vector3(1, 0, 0).applyQuaternion(parentInverse),
      };
    };
    const feet = ["Foot.L", "Foot.R"].map(limb);
    const hands = ["Hand.L", "Hand.R"].map(limb);
    const mixer = new THREE.AnimationMixer(scene);
    const clips = Object.fromEntries(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
    return { scene, scale, offset: [-center.x * scale, -bounds.min.y * scale, -center.z * scale] as [number, number, number], mixer, clips, materials, contacts, meshes, feet, hands };
  }, [gltf, pet, uniforms]);
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
    const walking = !still && !held?.current && (action === "walk" || action === "approach" || action === "return");
    gaitBlend.current = THREE.MathUtils.damp(gaitBlend.current, Number(walking), 18, Math.min(dt, .05));
    const phase = (gaitTime ? gaitTime.current * 7.1 : asset.mixer.time * 8);
    for (let index = 0; index < 2; index++) {
      const cycle = Math.sin(phase + index * Math.PI);
      const stride = gaitBlend.current * (1 - seat.current);
      const foot = asset.feet[index];
      const hand = asset.hands[index];
      if (foot) {
        foot.bone.position.copy(foot.base)
          .addScaledVector(foot.forward, cycle * .081 * stride)
          .addScaledVector(foot.up, Math.max(0, cycle) * .049 * stride);
        foot.bone.quaternion.copy(foot.rotation)
          .premultiply(swing.setFromAxisAngle(foot.sideways, cycle * .24 * stride));
      }
      if (hand && gaitBlend.current > .002) {
        // Small, textured hands need displacement as well as rotation to read at island scale.
        const weight = gaitBlend.current;
        hand.bone.position.lerp(vertex.copy(hand.base)
          .addScaledVector(hand.forward, -cycle * .088)
          .addScaledVector(hand.up, Math.abs(cycle) * .024), weight);
        hand.bone.quaternion.slerp(swing.setFromAxisAngle(hand.sideways, -cycle * .44).multiply(hand.rotation), weight);
      }
    }
    if(root.current && !pet){
      root.current.scale.set(asset.scale*(1+.075*seat.current),asset.scale*(1-.16*seat.current),asset.scale);
      gl.domElement.dataset.seatedPose = seat.current.toFixed(3);
      const seatedOffset = asset.offset[1] - .06 * seat.current;
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
    if (mood && reactionUntil !== reactionStamp.current) {
      reactionStamp.current = reactionUntil;
      reactionExpression.current = chooseExpression(mood, reactionExpression.current);
    }
    const expression = mood && reactionExpression.current ? reactionExpression.current :
      action === "happy" ? "happy" : action === "rest" ? "sleepy" :
      action === "stretch" ? "surprised" : action === "listen" ? "curious" : "calm";
    const targetFace = face ?? expressionPresets[expression].face;
    if (targetFace.some((part,i) => part !== renderedFace.current[i])) {
      uniforms.faceA.value = uniforms.faceMix.value < .5 ? uniforms.faceA.value : uniforms.faceB.value;
      uniforms.faceB.value = [...targetFace];
      uniforms.faceMix.value = 0;
      renderedFace.current = targetFace;
    }
    const step = Math.min(dt,.05);
    uniforms.faceMix.value = Math.min(1,uniforms.faceMix.value+step*5);
    if (!still && !face) faceTime.current += step;
    const blink = faceTime.current % 4.7;
    const glance = faceTime.current % 10;
    uniforms.faceBlink.value = !still && !face && blink > 4.5 ? Math.sin((blink-4.5)/.2*Math.PI) : 0;
    uniforms.faceGaze.value.x = !still && !face && glance > 7 ? .009*Math.sin((glance-7)*Math.PI/3) : 0;
    gl.domElement.dataset.expression = expression;
    gl.domElement.dataset.face = targetFace.join(",");
    gl.domElement.dataset.faceBlend = uniforms.faceMix.value.toFixed(2);
    gl.domElement.dataset.modelReady = "user-nebula";
    gl.domElement.dataset.modelPath = SUPPLIED_NEBULA_URL;
    gl.domElement.dataset.companion = "nebula";
    gl.domElement.dataset.suppliedClip = current.current?.getClip().name || "none";
  });
  return <group ref={root} name="SuppliedNebula" position={asset.offset} scale={asset.scale}>
    <primitive object={asset.scene} />
  </group>;
}
