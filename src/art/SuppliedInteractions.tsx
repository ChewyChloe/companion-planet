import {useRef} from 'react';import {useFrame,useThree} from '@react-three/fiber';import * as THREE from 'three';
import {useWorld} from '../store';import {suppliedLamp,suppliedBook,suppliedFlower,type SuppliedWorldId} from './supplied-world-config';
/** Spatial interaction proxies for merged user assets; never substitute an image for geometry. */
export function SuppliedInteractions({id}:{id:SuppliedWorldId}){
 const on=useWorld(s=>s.lampOn),light=useRef<THREE.PointLight>(null);const {gl}=useThree();
 const local=(p:readonly number[]):[number,number,number]=>[p[0]-.72,p[1]-.14,p[2]-.23];
 useFrame((_,dt)=>{if(light.current)light.current.intensity=THREE.MathUtils.damp(light.current.intensity,on?1.6:0,5,Math.min(dt,.1));});
 return <>
 <mesh name="InteractiveFlower" position={local(suppliedFlower(id))} onPointerOver={e=>{e.stopPropagation();gl.domElement.style.cursor='pointer';}} onPointerOut={()=>gl.domElement.style.cursor='auto'} onClick={e=>{e.stopPropagation();if(e.delta<6)useWorld.getState().toggleFlowers();}}>
  <sphereGeometry args={[.55,12,8]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
 </mesh>
 {(id==='b612'||id==='rose')&&<group position={local(suppliedLamp(id))}>
  <mesh name="LampTouchTarget" onPointerOver={e=>{e.stopPropagation();gl.domElement.style.cursor='pointer';}} onPointerOut={()=>gl.domElement.style.cursor='auto'} onClick={e=>{e.stopPropagation();if(e.delta<6)useWorld.getState().toggleLamp();}}>
   <sphereGeometry args={[.32,12,8]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>
  <pointLight ref={light} name="DeskLampLight" position={[0,-.25,0]} color="#ffdfae" distance={4} decay={2} intensity={on?1.6:0}/>
 </group>}
 {id!=='forest'&&<mesh name="SuppliedBookHitArea" position={local(suppliedBook(id))} onClick={e=>{e.stopPropagation();if(e.delta<6)useWorld.getState().react('read');}}>
  <boxGeometry args={[.75,.22,.65]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
 </mesh>}
 </>;
}
