import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
export function NebulaBloom() {
  const { gl, scene, camera, size } = useThree();
  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl);
    const render = new RenderPass(scene,camera);
    const bloom = new UnrealBloomPass(new THREE.Vector2(512,512),.14,.30,1.25);
    const output = new OutputPass();
    composer.addPass(render);composer.addPass(bloom);composer.addPass(output);
    return { composer, render, bloom, output };
  },[gl,scene,camera]);
  useEffect(() => {pipeline.composer.setPixelRatio(1);pipeline.composer.setSize(size.width,size.height);},[pipeline,size]);
  useEffect(() => {
    // QA invokes this exact final browser pipeline, including Bloom.
    scene.userData.renderMaterialPreview = () => pipeline.composer.render();
    return () => {delete scene.userData.renderMaterialPreview;pipeline.bloom.dispose();pipeline.output.dispose();pipeline.composer.dispose();};
  },[pipeline,scene]);
  useFrame(() => pipeline.composer.render(),1);
  return null;
}
