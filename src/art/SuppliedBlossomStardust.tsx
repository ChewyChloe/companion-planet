import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box3, Color, Group, MathUtils, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Vector3 } from "three";
import type { Action } from "../domain";
import { useWorld } from "../store";
import { blendPose, neutralPose, poseFor } from "./character-animation";

export function SuppliedBlossomStardust({ id, action, time, gaitTime, still, held, seatBlend, pet, poseTime }: {
  id: "blossom" | "stardust";
  action: Action;
  time: RefObject<number>;
  gaitTime?: RefObject<number>;
  still?: boolean;
  held?: RefObject<boolean>;
  seatBlend?: RefObject<number>;
  pet?: boolean;
  poseTime?: number;
}) {
  const blossom = id === "blossom";
  const path = `models/user-residents/${id}.glb`;
  const { scene } = useLoader(GLTFLoader, import.meta.env.BASE_URL + path + (blossom ? "" : "?v=3"));
  const actor = useRef<Group>(null);
  const pose = useRef({ ...neutralPose });
  const concentrate = useRef(0);
  const asset = useMemo(() => {
    const model = scene.clone(true);
    // The face on the supplied torso is turned slightly to its right.
    const starBody = model.getObjectByName("StarBody");
    if (starBody) starBody.rotation.y = -.27;
    const shapedHands = [];
    const blossomBody = blossom ? model.getObjectByName("tripo_part_0") : undefined;
    const bodyInverse = new Matrix4();
    const handJoins = new Map<Mesh, { handToTorso: { value: Matrix4 }; torsoToHand: { value: Matrix4 } }>();
    if (blossom) {
      for (const part of ["tripo_part_6", "tripo_part_3"]) {
        const hand = model.getObjectByName(part);
        if (!(hand instanceof Mesh)) continue;
        const geometry = hand.geometry.clone();
        const positions = geometry.attributes.position;
        const normals = geometry.attributes.normal;
        const normal = new Vector3();
        // +X faces outward. Sink the upper root into the body and keep the tip full.
        for (let i = 0; i < positions.count; i++) {
          const height = MathUtils.clamp((positions.getY(i) + .035) / .10, 0, 1);
          const round = height * height * (3 - 2 * height);
          positions.setX(i, positions.getX(i) - .008 - .024 * round);
          if (normals) {
            const slope = .024 * 6 * height * (1 - height) / .10;
            normal.fromBufferAttribute(normals, i);
            normal.y += normal.x * slope;
            normal.normalize();
            normals.setXYZ(i, normal.x, normal.y, normal.z);
          }
        }
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        hand.geometry = geometry;
        shapedHands.push(geometry);
        handJoins.set(hand, { handToTorso: { value: new Matrix4() }, torsoToHand: { value: new Matrix4() } });
      }
    }
    const bounds = new Box3().setFromObject(model);
    const pivot = (name: string, point: [number, number, number], parts: string[]) => {
      const joint = new Group();
      joint.name = name;
      joint.position.set(...point);
      model.add(joint);
      for (const part of parts) {
        const object = model.getObjectByName(part);
        if (object) joint.attach(object);
      }
      return joint;
    };
    const arm = blossom ? [] : [
      pivot("ResidentArmL", [-.271,.32,.15], ["StarArmL"]),
      pivot("ResidentArmR", [.271,.32,.15], ["StarArmR"]),
    ];
    const foot = blossom ? [
      pivot("ResidentFootL", [-.021,.085,.125], ["tripo_part_4"]),
      pivot("ResidentFootR", [-.010,.085,-.123], ["tripo_part_7"]),
    ] : [
      pivot("ResidentFootL", [-.141,.106,.147], ["StarFootL"]),
      pivot("ResidentFootR", [.141,.106,.147], ["StarFootR"]),
    ];
    const head = blossom ? pivot("BlossomBud", [.017,.698,-.008], ["tripo_part_1","tripo_part_2"])
      : pivot("StardustHood", [0,.52,.02], ["StarHood"]);
    const wings = blossom ? [] : [
      pivot("StardustWingL", [-.284,.39,-.118], ["StarWingL"]),
      pivot("StardustWingR", [.284,.39,-.118], ["StarWingR"]),
    ];
    const eyes = [model.getObjectByName("tripo_part_8"), model.getObjectByName("tripo_part_5")];
    const mouth = model.getObjectByName("tripo_part_9");
    const expression = { starClose: { value: 0 }, starSmile: { value: 0 }, starFocus: { value: 0 } };
    const materials: MeshPhysicalMaterial[] = [];
    model.traverse(object => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
      const source = object.material;
      const pinkParts: Record<string, string> = {
        tripo_part_0: "#f3a9be",
        tripo_part_3: "#f3a9be",
        tripo_part_4: "#f3a9be",
        tripo_part_6: "#f3a9be",
        tripo_part_7: "#f3a9be",
      };
      const pink = blossom ? pinkParts[object.name] : undefined;
      const gel = new MeshPhysicalMaterial({
        color: pink ? new Color(pink) : source.color, map: pink ? null : source.map,
        normalMap: pink ? null : source.normalMap,
        normalScale: source.normalScale.clone().multiplyScalar(blossom ? .14 : .24),
        side: source.side, metalness: 0, roughness: blossom ? .35 : .42,
        clearcoat: .60, clearcoatRoughness: .27, ior: 1.38,
      });
      const join = handJoins.get(object);
      if (join) {
        gel.onBeforeCompile = shader => {
          Object.assign(shader.uniforms, join);
          shader.vertexShader = `
            uniform mat4 handToTorso;
            uniform mat4 torsoToHand;
            varying vec3 torsoNormalAtHand;
            varying float handClearance;
          ` + shader.vertexShader.replace("#include <begin_vertex>", `
            #include <begin_vertex>
            // Local quadratic fit of the supplied torso across the hands' range.
            vec3 torso = (handToTorso * vec4(position,1.0)).xyz;
            float y = torso.y;
            float z = torso.z;
            float frontSurface = .2344 - .1113*y - .0031*z - 1.1503*y*y + .0195*y*z - 1.3367*z*z;
            vec3 torsoNormal = normalize(vec3(1.0,.1113+2.3006*y-.0195*z,.0031+2.6734*z-.0195*y));
            torsoNormalAtHand = normalMatrix * mat3(torsoToHand) * torsoNormal;
            handClearance = torso.x - frontSurface;
          `);
          shader.fragmentShader = "varying vec3 torsoNormalAtHand;\nvarying float handClearance;\n" +
            shader.fragmentShader.replace("#include <normal_fragment_begin>", `
              #include <normal_fragment_begin>
              float handRoundness = smoothstep(.007,.061,handClearance);
              normal = normalize(mix(normalize(torsoNormalAtHand),normal,handRoundness));
              nonPerturbedNormal = normal;
            `);
        };
        gel.customProgramCacheKey = () => "blossom-hand-contact";
      }
      if (blossom && object.name === "tripo_part_1") {
        gel.map = null;
        gel.normalMap = null;
        gel.roughness = .46;
        gel.clearcoat = .30;
        gel.onBeforeCompile = shader => {
          shader.vertexShader = "varying float petalHeight;\n" + shader.vertexShader.replace(
            "#include <begin_vertex>", "#include <begin_vertex>\npetalHeight = position.y;");
          shader.fragmentShader = "varying float petalHeight;\n" + shader.fragmentShader.replace(
            "#include <map_fragment>", `
            #include <map_fragment>
            float tip = smoothstep(-.135,.115,petalHeight);
            diffuseColor.rgb *= mix(vec3(1.,.61,.56),vec3(.89,.31,.43),tip);
          `);
        };
        gel.customProgramCacheKey = () => "blossom-petal-gradient";
      }
      if (blossom && object.name === "tripo_part_0") {
        gel.onBeforeCompile = shader => {
          shader.vertexShader = "varying vec3 blossomSurface;\n" + shader.vertexShader.replace(
            "#include <begin_vertex>", "#include <begin_vertex>\nblossomSurface = position;");
          shader.fragmentShader = "varying vec3 blossomSurface;\n" + shader.fragmentShader.replace(
            "#include <map_fragment>", `
            #include <map_fragment>
            vec2 cheek = (vec2(abs(blossomSurface.z),blossomSurface.y)-vec2(.191,.035))/vec2(.082,.061);
            float blush = exp(-2.0*dot(cheek,cheek))*smoothstep(.06,.18,blossomSurface.x);
            diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.85,.20,.25),blush*.52);
          `);
        };
        gel.customProgramCacheKey = () => "blossom-cheeks";
      }
      if (object.name === "StarHood") {
        gel.roughness = .31;
        gel.onBeforeCompile = shader => {
          shader.vertexShader = "varying vec3 hoodPoint;\n" + shader.vertexShader.replace(
            "#include <begin_vertex>", "#include <begin_vertex>\nhoodPoint = position;");
          shader.fragmentShader = "varying vec3 hoodPoint;\n" + shader.fragmentShader.replace(
            "#include <map_fragment>", `
            #include <map_fragment>
            float cape = 1.0-smoothstep(.72,.82,hoodPoint.y);
            float rim = pow(1.0-abs(dot(normalize(vNormal),normalize(vViewPosition))),2.4);
            float flame = smoothstep(.873,.978,hoodPoint.y)*smoothstep(.055,.16,abs(hoodPoint.x));
            vec3 lavender = vec3(.091,.135,.28)+rim*vec3(.23,.31,.44);
            float star = smoothstep(.32,.75,max(diffuseColor.r,diffuseColor.g));
            diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb*.43+lavender,vec3(.66,.80,.96),star),cape);
            diffuseColor.rgb = mix(diffuseColor.rgb,vec3(1.,.68,.28),flame*.86);
          `).replace("#include <emissivemap_fragment>", `
            #include <emissivemap_fragment>
            totalEmissiveRadiance += vec3(.31,.145,.045)*flame;
          `);
        };
        gel.customProgramCacheKey = () => "stardust-periwinkle-cape";
      }
      if (object.name === "StarBody") {
        gel.onBeforeCompile = shader => {
          Object.assign(shader.uniforms, expression);
          shader.vertexShader = "varying vec3 starSurface;\n" + shader.vertexShader.replace(
            "#include <begin_vertex>", "#include <begin_vertex>\nstarSurface = position;");
          shader.fragmentShader = `
            varying vec3 starSurface;
            uniform float starClose;
            uniform float starSmile;
            uniform float starFocus;
            float starOval(vec2 p,vec2 r) {
              return 1.0-smoothstep(.86,1.0,length(p/r));
            }
            float starEye(vec2 p,float side){
              float arc = .010*(1.0-pow(clamp(abs(p.x/.029),0.0,1.0),2.0));
              float closed = starOval(p+vec2(0.,arc-.006),vec2(.030,.0044));
              float happy = starOval(p-vec2(0.,arc),vec2(.034,.007));
              // Mirror the chevrons horizontally so both tips point toward the nose.
              vec2 squeeze = vec2(p.x * side, abs(p.y));
              float stroke = abs(squeeze.x - (.022 - .92 * squeeze.y));
              float intent = (1.0-smoothstep(.003,.007,stroke)) * (1.0-smoothstep(.015,.022,squeeze.y));
              float roundEye = starOval(p,vec2(.030,.038));
              return mix(mix(mix(roundEye,closed,starClose),intent,starFocus),happy,starSmile);
            }
          ` + shader.fragmentShader.replace("#include <map_fragment>", `
            #include <map_fragment>
            float belt = 1.0-smoothstep(.226,.236,starSurface.y);
            float piping = smoothstep(.207,.218,starSurface.y);
            diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.09,.12,.24)+piping*.050,belt*.94);
            vec2 at = starSurface.xy;
            float front = smoothstep(.06,.14,starSurface.z);
            float starEyes = front * max(starEye(at-vec2(-.048,.420),1.0),starEye(at-vec2(.190,.428),-1.0));
            float starMouth = front * starOval(at-vec2(.079,.383), vec2(.030,mix(.006,.014,starSmile)));
            float starFace = max(starEyes,starMouth);
            diffuseColor.rgb = mix(diffuseColor.rgb,vec3(1.,.71,.35),starFace);
          `).replace("#include <emissivemap_fragment>", `
            #include <emissivemap_fragment>
            totalEmissiveRadiance += vec3(.34,.16,.045)*starFace;
          `);
        };
        gel.customProgramCacheKey = () => "stardust-gold-expressions";
      }
      object.material = gel;
      object.castShadow = !join;
      materials.push(gel);
    });
    if (blossomBody) {
      blossomBody.updateWorldMatrix(true,false);
      bodyInverse.copy(blossomBody.matrixWorld).invert();
      for (const [hand,join] of handJoins) {
        hand.updateWorldMatrix(true,false);
        join.handToTorso.value.multiplyMatrices(bodyInverse,hand.matrixWorld);
        join.torsoToHand.value.copy(join.handToTorso.value).invert();
      }
    }
    return { model, arm, foot, head, wings, eyes, mouth, expression, materials, shapedHands,
      center: bounds.getCenter(new Vector3()), floor: bounds.min.y, scale: 1.42 / bounds.getSize(new Vector3()).y };
  }, [scene, blossom]);
  useEffect(() => () => {
    asset.materials.forEach(material => material.dispose());
    asset.shapedHands.forEach(geometry => geometry.dispose());
  }, [asset]);

  useFrame(({ gl }, delta) => {
    const dt = Math.min(delta, .08);
    const t = poseTime ?? time.current;
    const motion = still || held?.current ? "idle" : action;
    const p = blendPose(pose.current, still ? neutralPose : poseFor(motion,t,gaitTime?.current ?? t),dt);
    const { reduced, timer } = useWorld.getState();
    const energy = still ? 0 : reduced ? .45 : 1;
    const focus = !still && (motion === "read" || (timer.running && timer.phase === "focus" && motion === "idle"));
    concentrate.current = MathUtils.damp(concentrate.current,Number(focus),9,dt);
    const seated = !pet && motion === "read" ? seatBlend?.current ?? 0 : 0;
    const stretch = p.scaleY;
    if (actor.current) {
      actor.current.scale.set(1 / Math.sqrt(stretch),stretch,1 / Math.sqrt(stretch));
      actor.current.position.y = p.lift * .68 - seated * .025;
      actor.current.rotation.set(p.pitch * .64,p.yaw * .64,p.roll * .60);
    }
    for (let i=0;i<2;i++) {
      const side = i === 0 ? -1 : 1;
      const arm = i === 0 ? p.leftArmSwing : p.rightArmSwing;
      const leg = i === 0 ? p.leftLeg : p.rightLeg;
      const lift = i === 0 ? p.leftFootLift : p.rightFootLift;
      if (blossom) {
        asset.foot[i].rotation.z = leg * .51;
        asset.foot[i].position.y = .085 + lift * (1-seated);
        asset.eyes[i]?.scale.set(1,Math.max(.12,p.eyeOpen*(1 - p.happyEyes*.59 - concentrate.current*.35)),1);
        const eye = asset.eyes[i];
        if (eye) eye.rotation.x = (concentrate.current - p.happyEyes) * side * .38;
      } else {
        asset.arm[i].rotation.set(arm * .31 - p.armForward * .55,0,side * p.armRaise * .25);
        asset.foot[i].rotation.x = leg * .55 - seated * .16;
        asset.foot[i].position.y = .106 + lift * (1-seated);
        asset.wings[i].rotation.set((Math.sin(t*2.8 - i*.25) * .052 + p.happyEyes*Math.sin(t*7)*.13) * energy,
          side * (p.happyEyes *.14 + Math.sin(t*2.4)*.043*energy),side * p.happyEyes*.14);
      }
    }
    if (asset.mouth) asset.mouth.scale.y = 1 + p.mouthOpen * .76;
    asset.head.rotation.set(Math.sin(t*2.1)*.040*energy,0,(p.antenna*.54 + Math.sin(t*1.75-.7)*.046)*energy);
    asset.expression.starClose.value = 1 - MathUtils.smoothstep(p.eyeOpen,.15,.73);
    asset.expression.starSmile.value = p.happyEyes;
    asset.expression.starFocus.value = concentrate.current;
    gl.domElement.dataset.modelReady = `user-${id}`;
    gl.domElement.dataset.modelPath = path;
    gl.domElement.dataset.companion = id;
  });

  return (
    <group ref={actor} name={blossom ? "SuppliedBlossom" : "SuppliedStardust"}>
      <group rotation-y={blossom ? -Math.PI/2 : 0} scale={asset.scale}>
        <primitive object={asset.model} position={[-asset.center.x,-asset.floor,-asset.center.z]} />
      </group>
    </group>
  );
}
