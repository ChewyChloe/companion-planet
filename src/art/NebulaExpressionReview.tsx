import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { SuppliedNebula } from "./SuppliedNebula";
import { browOptions, eyeOptions, expressionPresets, mouthOptions, type Expression, type Face } from "./nebula-expressions";
import type { Action } from "../domain";

const controls = [
  ["左眼", eyeOptions], ["右眼", eyeOptions], ["左眉", browOptions],
  ["右眉", browOptions], ["嘴巴", mouthOptions],
] as const;
const angles = {
  front: [0,.80,2.95],
  side: [2.95,.80,0],
  bottom: [0,-2.25,1.15],
} as const;

export default function NebulaExpressionReview() {
  const params = new URLSearchParams(location.search);
  const requested = params.get("expression") as Expression;
  const initial = Object.hasOwn(expressionPresets, requested) ? requested : "calm";
  const [preset,setPreset] = useState<Expression>(initial);
  const [face,setFace] = useState<Face>(expressionPresets[initial].face);
  const [pose,setPose] = useState<Action>(params.get("pose")==="walk" ? "walk" : params.get("pose")==="read" ? "read" : "idle");
  const [view,setView] = useState<keyof typeof angles>(params.get("view")==="bottom" ? "bottom" : params.get("view")==="side" ? "side" : "front");
  const seated = useRef(0);
  seated.current = pose === "read" ? 1 : 0;
  return <main className="nebula-review">
    {!params.has("capture") && <section aria-label="星雲仔表情預覽">
      <label>表情預設 <select aria-label="表情預設" value={preset} onChange={event => {
        const next=event.target.value as Expression;
        setPreset(next);
        setFace(expressionPresets[next].face);
      }}>{Object.entries(expressionPresets).map(([id,item])=><option value={id} key={id}>{item.label}</option>)}</select></label>
      {controls.map(([label,options],index)=><label key={label}>{label} <select aria-label={label} value={face[index]} onChange={event => {
        const value=Number(event.target.value);
        setFace(current=>current.map((part,i)=>i===index ? value : part) as unknown as Face);
      }}>{options.map((option,i)=><option value={i} key={option}>{option}</option>)}</select></label>)}
      <label>視角 <select aria-label="視角" value={view} onChange={event=>setView(event.target.value as keyof typeof angles)}>
        <option value="front">正面</option><option value="side">側面</option><option value="bottom">底部</option>
      </select></label>
      <label>姿勢 <select aria-label="姿勢" value={pose} onChange={event=>setPose(event.target.value as Action)}>
        <option value="idle">待機</option><option value="walk">步行</option><option value="read">入座</option><option value="happy">跳躍</option>
      </select></label>
    </section>}
    <Canvas key={view} dpr={1} camera={{position:[...angles[view]], fov:35}}>
      <color attach="background" args={["#ede7ed"]}/>
      <ambientLight intensity={.85}/>
      <directionalLight position={[2,3,5]} intensity={2}/>
      <directionalLight position={[-2,-3,2]} intensity={1.1}/>
      <OrbitControls target={[0,view==="bottom" ? .48 : .77,0]} enablePan={false}/>
      <Suspense fallback={null}>
        <SuppliedNebula action={pose} face={face} seatBlend={seated} still={params.has("still")} />
      </Suspense>
    </Canvas>
  </main>;
}
