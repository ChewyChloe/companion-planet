import { NebulaBloom } from "./NebulaBloom";
import { OrbitControls } from "@react-three/drei";
import { SoftEnvironment } from "./SoftEnvironment";
import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import SculptCharacter from "./SculptCharacter";
import { companions, companionFor, type CompanionId } from "../companions";
import type { Action } from "../domain";
const actions: Action[] = [
  "idle",
  "walk",
  "read",
  "rest",
  "happy",
  "listen",
  "stretch",
  "approach",
  "return",
];
function Figure({
  action,
  angle,
  companionId,
  still,
}: {
  action: Action;
  angle: number;
  companionId: CompanionId;
  still: boolean;
}) {
  const time = useRef(0);
  const { gl, scene, camera } = useThree();
  const count = useRef(0);
  useFrame((_s, delta) => {
    time.current += Math.min(delta, 0.08);
    if (++count.current % 15 === 0) {
      gl.domElement.dataset.frames = String(count.current);
      gl.domElement.dataset.action = action;
      gl.domElement.dataset.triangles = String(gl.info.render.triangles);
      gl.domElement.dataset.calls = String(gl.info.render.calls);
      const root = scene.getObjectByName("CharacterRoot");
      if (root) {
        const box = new THREE.Box3().setFromObject(root);
        gl.domElement.dataset.bounds = JSON.stringify({
          min: box.min.toArray(),
          max: box.max.toArray(),
        });
      }
      camera.updateMatrixWorld();
    }
  });
  return (
    <group name="ReviewTurntable" rotation={[0, angle, 0]}>
      <SculptCharacter still={still} action={action} time={time} companionId={companionId} />
    </group>
  );
}
export default function ArtReview() {
  const params = new URLSearchParams(location.search);
  const action = actions.includes(params.get("pose") as Action)
    ? (params.get("pose") as Action)
    : "idle";
  const angles: Record<string, number> = {
    front: 0,
    side: Math.PI / 2,
    back: Math.PI,
    quarter: Math.PI / 4,
  };
  const angle = angles[params.get("view") || "front"] || 0;
  return (
    <div style={{ height: "100dvh", width: "100%", background: "#f4f1e8" }}>
      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        shadows
        dpr={1}
        camera={{ position: [0, 1, 4.1], fov: 33 }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 0.92, 0);
          gl.setClearColor("#f4f1e8", 1);
        }}
      >
        <OrbitControls makeDefault target={[0,.92,0]} enablePan={false} />
        <NebulaBloom />
        <SoftEnvironment />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#dce8ef", "#9c9488", 0.7]} />
        <directionalLight position={[-3, 4, 5]} intensity={2.2} />
        <directionalLight position={[3, 2, 1]} intensity={0.7} />
        <directionalLight position={[0, 3, -4]} intensity={1.4} />
        <Suspense fallback={null}>
          <Figure
            still={params.has("still")}
            action={action}
            angle={angle}
            companionId={companionFor(params.get("companion")).id}
          />
        </Suspense>
      </Canvas>
      {!params.has("capture") && <nav aria-label="彩色模型檢視" style={{ position:"absolute",bottom:12,left:12,right:12,padding:12,background:"#f4f1e8",display:"flex",gap:12,flexWrap:"wrap" }}>
        {companions.map(c=><a key={c.id} href={`?art-review&companion=${c.id}`}>{c.name}</a>)}
        <a href="/">返回同頻星球</a><span>拖曳旋轉・滾輪／雙指縮放</span>
      </nav>}
    </div>
  );
}
