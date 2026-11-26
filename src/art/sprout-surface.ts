import { BufferAttribute, type MeshStandardMaterial, type SkinnedMesh } from "three";

export function starWeights(mesh: SkinnedMesh) {
  if (mesh.geometry.hasAttribute("sproutStar")) return;
  const joint = mesh.skeleton.bones.findIndex(bone => bone.name === "star");
  const { skinIndex, skinWeight } = mesh.geometry.attributes;
  const weights = new Float32Array(skinIndex.count);
  if (joint >= 0) {
    for (let vertex = 0; vertex < weights.length; vertex++) {
      for (let slot = 0; slot < 4; slot++) {
        if (skinIndex.getComponent(vertex, slot) === joint)
          weights[vertex] += skinWeight.getComponent(vertex, slot);
      }
    }
  }
  mesh.geometry.setAttribute("sproutStar", new BufferAttribute(weights, 1));
}

export function sproutSurface(material: MeshStandardMaterial, controls: {
  star: { value: number }; eyes: { value: number }; smile: { value: number };
}) {
  material.onBeforeCompile = shader => {
    shader.uniforms.sproutGlow = controls.star;
    shader.uniforms.sproutEyes = controls.eyes;
    shader.uniforms.sproutSmile = controls.smile;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        attribute float sproutStar;
        varying float starWeight;
        uniform float sproutEyes, sproutSmile;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        starWeight = sproutStar;
        // Place the expressive displacement around the painted facial features.
        // It runs before skinning so the original texture follows the head.
        float front = smoothstep(.105,.16,position.z);
        vec2 eye = vec2((abs(position.x)-.083)/.040,(position.y-.460)/.047);
        float blink = front * exp(-dot(eye,eye));
        transformed.y -= (position.y-.460) * blink * (1.-sproutEyes);
        vec2 mouth = vec2(position.x/.054,(position.y-.403)/.032);
        float smile = front * exp(-dot(mouth,mouth));
        transformed.y += sproutSmile * smile * (.011 * mouth.x*mouth.x - .0045);`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        varying float starWeight;
        uniform float sproutGlow;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1., .66, .23) * sproutGlow * smoothstep(.32, .9, starWeight);`);
  };
  material.customProgramCacheKey = () => "sprout-painted-face-and-star-v1";
}
