import { SuppliedFern } from "./SuppliedFern";
import { SuppliedNebula } from "./SuppliedNebula";
import { faceVisibleFrom } from "./locomotion";
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
  parentUp: THREE.Vector3;
}
function LegacyCharacter({
  action,
  companionId,
  held,
  time,
  seatBlend,
  pet = false,
  still = false,
  modelUrl,
  gaitTime,
  poseTime,
}: {
  action: Action;
  companionId?: CompanionId;
  held?: React.RefObject<boolean>;
  time: React.RefObject<number>;
  modelUrl?: string;
  gaitTime?: React.RefObject<number>;
  poseTime?: number;
  seatBlend?: React.RefObject<number>;
  pet?: boolean;
  still?: boolean;
}) {
  const selected = useWorld((s) => s.companionId);
  const id = companionId || selected;
  const materialVariant = resolveNebulaMaterial(id);
  const materialPreview = id === "nebula" && !!getNebulaMaterialVariant();
  const freezePose = still;
  const previewModel = residentModelPath(id);
  const gltf = useLoader(GLTFLoader, modelUrl || import.meta.env.BASE_URL + previewModel);
  const { gl, camera } = useThree();
  const pose = useRef({ ...neutralPose });
  const root = useRef<THREE.Group>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const view = useMemo(()=>({ forward:new THREE.Vector3(), right:new THREE.Vector3(), origin:new THREE.Vector3(), observer:new THREE.Vector3(), rotation:new THREE.Quaternion() }),[]);
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
          parentUp: new THREE.Vector3(0,1,0).applyQuaternion(node.parent!.getWorldQuaternion(new THREE.Quaternion()).invert()),
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
    // A seated corrective supports the entire underside, including the feet.
    // Work in character coordinates because GLB vertices retain Blender's axes.
    const base = bodyMesh.geometry.attributes.position;
    const seatedIndex = bodyMesh.morphTargetDictionary!.Seated;
    const seated = new Float32Array(base.count * 3);
    const toCharacter = scene.matrixWorld.clone().invert().multiply(bodyMesh.matrixWorld);
    const toBody = toCharacter.clone().invert();
    const point = new THREE.Vector3(), original = new THREE.Vector3();
    for (let i=0;i<base.count;i++) {
      original.fromBufferAttribute(base,i);point.copy(original).applyMatrix4(toCharacter);
      const dy=point.y-.14;
      point.y=.14+.5*(dy+Math.sqrt(dy*dy+.000225));
      point.applyMatrix4(toBody);
      if(bodyMesh.geometry.morphTargetsRelative)point.sub(original);
      point.toArray(seated,i*3);
    }
    bodyMesh.geometry.morphAttributes.position![seatedIndex]=new THREE.Float32BufferAttribute(seated,3);
    const absoluteSeat = new Float32Array(seated);
    if(bodyMesh.geometry.morphTargetsRelative)for(let i=0;i<absoluteSeat.length;i++)absoluteSeat[i]+=base.array[i];
    const normalMesh = new THREE.BufferGeometry();
    normalMesh.setIndex(bodyMesh.geometry.index);
    normalMesh.setAttribute("position",new THREE.Float32BufferAttribute(absoluteSeat,3));
    normalMesh.computeVertexNormals();
    const normals = new Float32Array(normalMesh.attributes.normal.array);
    if(bodyMesh.geometry.morphTargetsRelative)for(let i=0;i<normals.length;i++)normals[i]-=bodyMesh.geometry.attributes.normal.array[i];
    bodyMesh.geometry.morphAttributes.normal ||= [];
    bodyMesh.geometry.morphAttributes.normal[seatedIndex]=new THREE.Float32BufferAttribute(normals,3);
    normalMesh.dispose();

    const expressionMaterials: THREE.Material[] = [];
    const expressionGeometries: THREE.BufferGeometry[] = [];
    const happyArcs: Record<string,THREE.Mesh> = {};
    const worldFrame = scene.getWorldQuaternion(new THREE.Quaternion());
    for (const side of ["Left","Right"]) {
      const eye=controls[side+"Eye"].node;
      const inverse=eye.getWorldQuaternion(new THREE.Quaternion()).invert();
      const right=new THREE.Vector3(1,0,0).applyQuaternion(worldFrame).applyQuaternion(inverse);
      const up=new THREE.Vector3(0,1,0).applyQuaternion(worldFrame).applyQuaternion(inverse);
      const front=new THREE.Vector3(0,0,1).applyQuaternion(worldFrame).applyQuaternion(inverse);
      const points=Array.from({length:17},(_,i)=>right.clone().multiplyScalar((i/16-.5)*.062).addScaledVector(up,Math.sin(i/16*Math.PI)*.014).addScaledVector(front,.025));
      const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.0045,8,false);
      const ink=new THREE.MeshStandardMaterial({color:id==="stardust"?"#efd493":"#27343c",roughness:.55,transparent:true,opacity:1,depthWrite:true});
      const arc=new THREE.Mesh(geometry,ink);arc.name=side+"HappyEye";arc.renderOrder=5;arc.visible=false;eye.add(arc);happyArcs[side]=arc;
      expressionGeometries.push(geometry);expressionMaterials.push(ink);
    }
    const mouth=controls.Mouth.node as THREE.Mesh;
    mouth.geometry=mouth.geometry.clone();mouth.geometry.computeBoundingBox();
    const center=mouth.geometry.boundingBox!.getCenter(new THREE.Vector3());
    mouth.geometry.translate(-center.x,-center.y,-center.z);
    mouth.position.add(center.clone().multiply(mouth.scale).applyQuaternion(mouth.quaternion));mouth.updateMatrixWorld(true);
    controls.Mouth.position.copy(mouth.position);expressionGeometries.push(mouth.geometry);
    const front=new THREE.Vector3(0,0,1).applyQuaternion(worldFrame).applyQuaternion(mouth.getWorldQuaternion(new THREE.Quaternion()).invert());
    const openGeometry=new THREE.CircleGeometry(1,40);
    const openMaterial=new THREE.MeshStandardMaterial({color:"#765663",roughness:.85,transparent:true,opacity:1,depthWrite:true,side:THREE.DoubleSide});
    const openMouth=new THREE.Mesh(openGeometry,openMaterial);openMouth.name="OpenMouthExpression";openMouth.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),front);openMouth.position.copy(front).multiplyScalar(.006);openMouth.renderOrder=5;openMouth.visible=false;mouth.add(openMouth);
    expressionGeometries.push(openGeometry);expressionMaterials.push(openMaterial);
    return {
      happyArcs, openMouth, expressionMaterials, expressionGeometries,
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
      asset.expressionGeometries.forEach(g=>g.dispose());
      asset.expressionMaterials.forEach(m=>m.dispose());
      asset.faceMaterials.forEach((m) => m.dispose());
      asset.skin.dispose();
      asset.antennaSkin.dispose();
    };
  }, [asset, gl, id, materialVariant, materialPreview, previewModel]);
  useFrame((_state, delta) => {
    asset.skin.userData.clock.value = materialVariant || freezePose ? 0 : time.current;
    const animationTime = poseTime ?? (freezePose ? 1 : time.current);
    const desired = freezePose ? { ...neutralPose, armRaise: 0, eyeOpen: 1 } : poseFor(action, animationTime, gaitTime?.current ?? animationTime);
    if (id === "water") {
      desired.scaleY = 1 + (desired.scaleY - 1) * 1.6;
      desired.roll *= 1.25;
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
    const p = freezePose || poseTime !== undefined ? Object.assign(pose.current, desired) : blendPose(pose.current, desired, delta);
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
        -1.25 * p.armForward + (side === "Left" ? p.leftArmSwing : p.rightArmSwing),
        -sign * p.armForward,
        sign * p.armRaise,
      );
      c[side + "Arm"].node.position.copy(c[side + "Arm"].position);
      c[side + "Arm"].node.position.z += p.armForward * 0.62;
      c[side + "Arm"].node.position.y += p.armForward * 0.3;
      c[side + "Arm"].node.position.x -= sign * p.armForward * 0.3;
      const leg = c[side+"Leg"];
      rotate(leg, side === "Left" ? p.leftLeg : p.rightLeg);
      leg.node.position.copy(leg.position).addScaledVector(leg.parentUp,side === "Left" ? p.leftFootLift : p.rightFootLift);
      const eye = c[side + "Eye"];
      eye.node.scale.copy(eye.scale);
      eye.node.scale.x *= look.eyeScale;
      const happy=p.happyEyes>.5;
      eye.node.scale.y *= look.eyeScale * (happy ? 1 : p.eyeOpen);
      const surface=asset.scene.getObjectByName(side+"EyeSurface")!;
      surface.visible=!happy;asset.happyArcs[side].visible=happy;
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
    asset.scene.getWorldQuaternion(view.rotation);
    view.forward.set(0,0,1).applyQuaternion(view.rotation);
    asset.scene.getWorldPosition(view.origin);camera.getWorldPosition(view.observer);
    view.observer.sub(view.origin).normalize();
    view.right.set(1,0,0).applyQuaternion(view.rotation);
    const frontDot=view.forward.dot(view.observer), sideDot=view.right.dot(view.observer);
    const showMouth=faceVisibleFrom(frontDot);
    const showLeft=faceVisibleFrom(frontDot*.94-sideDot*.34),showRight=faceVisibleFrom(frontDot*.94+sideDot*.34);
    const showFace=showMouth||showLeft||showRight;
    c.LeftEye.node.visible=showLeft;c.RightEye.node.visible=showRight;c.Mouth.node.visible=showMouth;
    c.LeftCheek.node.visible=showLeft;c.RightCheek.node.visible=showRight;
    const mouth=c.Mouth.node as THREE.Mesh;
    mouth.scale.copy(c.Mouth.scale);
    const opened=p.mouthOpen>.20;
    (mouth.material as THREE.Material).visible=!opened;
    asset.openMouth.visible=opened;
    asset.openMouth.scale.set(.022+p.mouthOpen*.012,.018+p.mouthOpen*.025,1);
    if(!opened)mouth.scale.x *= 1+p.smile*.8;
    gl.domElement.dataset.faceVisible=String(showFace);
    gl.domElement.dataset.expression=p.happyEyes>.5?"happy":p.mouthOpen>.2?"open":p.eyeOpen<.2?"sleepy":p.smile>.4?"curious":"calm";
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

export default function SculptCharacter(props: Parameters<typeof LegacyCharacter>[0]) {
  const selected = useWorld(s => s.companionId);
  const id = props.companionId || selected;
  if (id === "fern" && !props.modelUrl && !getNebulaMaterialVariant())
    return <SuppliedFern {...props} />;
  if (id === "nebula" && !getNebulaMaterialVariant() && !props.modelUrl)
    return <SuppliedNebula action={props.action} held={props.held} still={props.still} pet={props.pet} seatBlend={props.seatBlend} gaitTime={props.gaitTime} />;
  return <LegacyCharacter {...props} />;
}
