import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
export function NebulaBloom({ paused = false }: { paused?: boolean } = {}) {
  const { gl, scene, camera, size } = useThree();
  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl);
    const render = new RenderPass(scene,camera);
    const bloom = new UnrealBloomPass(new THREE.Vector2(512,512),.14,.30,1.25);
    const output = new OutputPass();
    composer.addPass(render);composer.addPass(bloom);composer.addPass(output);
    return { composer, render, bloom, output };
  },[gl,scene,camera]);
  const resolution = useRef(0);
  useEffect(() => {resolution.current=0;},[pipeline,size]);
  useEffect(() => {
    // QA invokes this exact final browser pipeline, including Bloom.
    scene.userData.renderMaterialPreview = () => pipeline.composer.render();
    return () => {delete scene.userData.renderMaterialPreview;pipeline.bloom.dispose();pipeline.output.dispose();pipeline.composer.dispose();};
  },[pipeline,scene]);
  useFrame(() => {
    if (paused) return;
    // Match the renderer's adaptive DPR: a full-size offscreen buffer negates
    // RenderQuality's fill-rate reduction on phones and software WebGL.
    const ratio = Math.min(1, gl.getPixelRatio());
    if(resolution.current !== ratio) {
      pipeline.composer.setPixelRatio(ratio);
      pipeline.composer.setSize(size.width,size.height);
      resolution.current=ratio;
    }
    pipeline.composer.render();
  },1);
  return null;
}

export function DirectSceneRender({ paused }: { paused: boolean }) {
  useFrame(({ gl, scene, camera }) => {
    if (!paused) gl.render(scene, camera);
  }, 1);
  return null;
}
