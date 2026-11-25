import { registerWorldCollision } from "./world-collision";
import { suppliedLamp,suppliedFlower } from "./supplied-world-config";
import { useEffect, useMemo } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { useWorld } from "../store";
import type { PlanetId } from "../planets";
/** Complete user landscapes; only placement and texture resolution differ from the originals. */
export function PlanetArchitecture({id}:{id:PlanetId}) {
 const gltf=useLoader(GLTFLoader,`${import.meta.env.BASE_URL}models/user-worlds/${id}.glb?v=${id === "forest" ? "forest-water-1" : (id === "b612" || id === "moon") ? "upstream-water-2" : "storybook-pbr-1"}`);
 const {gl}=useThree();
 const asset=useMemo(()=>{
  const scene=gltf.scene.clone(true),materials:THREE.MeshStandardMaterial[]=[];let triangles=0;
  const uniforms={uWorldLamp:{value:new THREE.Vector3(...suppliedLamp(id)).add(new THREE.Vector3(0,-.2,0))},uWorldFlower:{value:new THREE.Vector3(...suppliedFlower(id))},uLampPower:{value:0},uFlowerPower:{value:0}};
  scene.traverse(node=>{if(!(node instanceof THREE.Mesh))return;
   triangles+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3;
   node.castShadow=true;node.receiveShadow=true;
   const replace=(source:THREE.MeshStandardMaterial)=>{const m=source.clone();if(source.name === "StorybookPaint"){m.roughness=1;m.metalness=1;m.normalScale.setScalar(.75);m.aoMapIntensity=.7;}else{m.roughness=Math.max(.8,m.roughness);m.metalness=0;}m.onBeforeCompile=shader=>{
     Object.assign(shader.uniforms,uniforms);
     shader.vertexShader='varying vec3 vSuppliedWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSuppliedWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
     shader.fragmentShader='varying vec3 vSuppliedWorld;uniform vec3 uWorldLamp;uniform vec3 uWorldFlower;uniform float uLampPower;uniform float uFlowerPower;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.,.67,.32)*uLampPower*(1.-smoothstep(.08,.45,distance(vSuppliedWorld,uWorldLamp)))*.4;\ntotalEmissiveRadiance+=vec3(.6,.29,.25)*uFlowerPower*(1.-smoothstep(.15,.7,distance(vSuppliedWorld,uWorldFlower)))*.35;');
    };
    m.customProgramCacheKey=()=>`supplied-world-interactions-${id}`;m.userData.interactionUniforms=uniforms;materials.push(m);return m;};
   node.material=Array.isArray(node.material)?node.material.map(replace):replace(node.material);
  });return {scene,materials,triangles,uniforms};
 },[gltf.scene,id]);
 useEffect(()=>{registerWorldCollision(id,asset.scene);gl.domElement.dataset.planetModel=`user-world-${id}`;gl.domElement.dataset.planetTriangles=String(asset.triangles);gl.domElement.dataset.planetFinish=asset.materials.every(m=>m.name==="StorybookPaint"&&m.roughnessMap&&m.metalnessMap&&m.aoMap)?"storybook-pbr-1":"gray";return()=>{delete gl.domElement.dataset.planetModel;asset.materials.forEach(m=>m.dispose());};},[asset,gl,id]);
 useFrame((_,dt)=>{const state=useWorld.getState();for(const material of asset.materials)material.emissiveIntensity=state.night?1.1:.23;asset.uniforms.uLampPower.value=THREE.MathUtils.damp(asset.uniforms.uLampPower.value,state.lampOn&&(id==='b612'||id==='rose')?1:0,5,Math.min(dt,.1));asset.uniforms.uFlowerPower.value=THREE.MathUtils.damp(asset.uniforms.uFlowerPower.value,state.flowersBloom?1:0,4,Math.min(dt,.1));});
 return <primitive object={asset.scene} name={`UserIsland-${id}`} onClick={(e:any)=>{if(e.delta<6){e.stopPropagation();useWorld.getState().goTo(e.point.x,e.point.z);}}} />;
}
