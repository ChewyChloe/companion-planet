import { NebulaInterior } from "./NebulaInterior";
import { useMemo } from "react";
import * as THREE from "three";
import type { CompanionId } from "../companions";
/** Small actual 3D inclusions, with depth/parallax rather than surface stickers. */
export function ResidentInterior({id}:{id:CompanionId}) {
  const points=useMemo(()=>Array.from({length:id==="stardust"?22:8},(_,i)=>{
    const z=1-2*(i+.5)/(id==="stardust"?22:8),r=Math.sqrt(1-z*z),a=i*2.399963;
    return new THREE.Vector3(Math.cos(a)*r*(id==="stardust"?.32:.23),.51+z*(id==="stardust"?.30:.24),Math.sin(a)*r*.18);
  }),[id]);
  if(id==="aurora")return <group name="Interior-aurora"><NebulaInterior variant="mist" center={[.065,.65,0]} radii={[.235,.34,.20]} showStars={false} /></group>;
  if(id!=="stardust"&&id!=="water")return null;
  return <group name={`Interior-${id}`}>
    {points.map((p,i)=><mesh key={i} name={`${id==="water"?"InternalBubble":"InternalGoldStar"}-${i}`} position={p} raycast={()=>undefined}>
      <sphereGeometry args={[id==="water"?.018+(i%3)*.009:.006+(i%5===0?.003:0),16,12]} />
      {id==="water"?<meshPhysicalMaterial color="#c4eff3" roughness={.12} transparent opacity={.30} depthWrite={false} metalness={0} clearcoat={.4} />:<meshBasicMaterial color={new THREE.Color('#efd394').multiplyScalar(2.8)} toneMapped={false} transparent opacity={.76} depthWrite={false} />}
    </mesh>)}
  </group>;
}
