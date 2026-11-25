import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";
const models = {
  b612: { name: "同頻星球", url: new URL("../../assets/art/user-models/同頻星球.glb", import.meta.url).href },
  moon: { name: "月光書原", url: new URL("../../assets/art/user-models/月光書原.glb", import.meta.url).href },
  rose: { name: "玫瑰花園", url: new URL("../../assets/art/user-models/玫瑰花園.glb", import.meta.url).href },
  forest: { name: "微風森林", url: new URL("../../assets/art/user-models/微風森林.glb", import.meta.url).href },
};
function Asset({ url }: { url: string }) {
  const model = useLoader(GLTFLoader, url);
  const { gl } = useThree();
  const normalized = useMemo(() => {
    const scene = model.scene.clone(true), box = new THREE.Box3().setFromObject(scene), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const scale = 7 / Math.max(size.x,size.z);
    scene.position.copy(center).multiplyScalar(-scale);scene.scale.setScalar(scale);
    return scene;
  }, [model.scene]);
  useEffect(() => { gl.domElement.dataset.userModelReady = "true"; }, [gl,normalized]);
  return <primitive object={normalized} name="UserSuppliedWorld" />;
}
export default function UserWorldReview() {
  const query = new URLSearchParams(location.search), requested = query.get("world") || "b612";
  const id = Object.hasOwn(models,requested) ? requested as keyof typeof models : "b612";
  const top = query.get("view") === "top";
  const angle = query.get("view") === "side" ? Math.PI/2 : query.get("view") === "back" ? Math.PI : Math.PI/4;
  return <main style={{position:"fixed",inset:0,background:"#e8e5e9",color:"#4b4656"}}>
    <Canvas camera={{position:top?[.001,14,.001]:[Math.sin(angle)*12,6,Math.cos(angle)*12],fov:38}} dpr={1} gl={{antialias:true}}>
      <color attach="background" args={["#e8e5e9"]}/>
      <ambientLight intensity={.8}/><hemisphereLight args={["#fff7ea","#c3bfd0",1]}/>
      <directionalLight position={[-3,8,6]} intensity={2}/><directionalLight position={[5,3,-3]} intensity={.7}/>
      <Suspense fallback={null}><Asset url={models[id].url}/></Suspense>
      <OrbitControls makeDefault target={[0,0,0]} minDistance={4} maxDistance={24}/>
    </Canvas>
    <nav aria-label="上傳模型檢視" style={{position:"absolute",top:16,left:16,display:"flex",gap:12,flexWrap:"wrap"}}>
      {Object.entries(models).map(([key,m])=><a key={key} href={`?world-model-review&world=${key}`} style={{background:"#fff",padding:"8px 16px",color:"inherit"}}>{m.name}</a>)}
    </nav>
    <p style={{position:"absolute",bottom:12,left:20}}>使用者原始灰模 · 可拖曳旋轉 · 正式場景已有上色與互動配置</p>
  </main>;
}
