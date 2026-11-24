import look from "../../assets/art/character-look.json";
import * as THREE from "three";
import type { CompanionId } from "../companions";
export function shouldUseThinShell(
  width: number,
  coarsePointer: boolean,
  renderer: string,
) {
  return (
    width < 700 ||
    coarsePointer ||
    /SwiftShader|llvmpipe|Software/i.test(renderer)
  );
}
export const skinProfiles: Record<
  CompanionId,
  {
    roughness: number;
    transmission: number;
    metalness: number;
    glow: string;
    scatter: number;
    iridescence: number;
    sheen: number;
  }
> = {
  nebula: {
    roughness: look.surfaceRoughness,
    transmission: 0.18,
    metalness: 0,
    glow: "#a6c9f0",
    scatter: 0.38,
    iridescence: 0.08,
    sheen: 0.08,
  },
  sprout: {
    roughness: 0.38,
    transmission: 0.12,
    metalness: 0,
    glow: "#ffe1a6",
    scatter: 0.5,
    iridescence: 0.22,
    sheen: 0.18,
  },
  fern: {
    roughness: 0.3,
    transmission: 0.22,
    metalness: 0,
    glow: "#bbdc92",
    scatter: 0.36,
    iridescence: 0.05,
    sheen: 0.05,
  },
  mushroom: {
    roughness: 0.46,
    transmission: 0.15,
    metalness: 0,
    glow: "#ffe2a0",
    scatter: 0.46,
    iridescence: 0.08,
    sheen: 0.14,
  },
  aurora: {
    roughness: 0.2,
    transmission: 0.32,
    metalness: 0.03,
    glow: "#9cddd5",
    scatter: 0.36,
    iridescence: 0.8,
    sheen: 0.08,
  },
  blossom: {
    roughness: 0.4,
    transmission: 0.16,
    metalness: 0,
    glow: "#ffd3ca",
    scatter: 0.5,
    iridescence: 0.12,
    sheen: 0.24,
  },
  stardust: {
    roughness: 0.32,
    transmission: 0.1,
    metalness: 0.02,
    glow: "#9caaf0",
    scatter: 0.28,
    iridescence: 0.2,
    sheen: 0.08,
  },
  water: {
    roughness: 0.1,
    transmission: 0.45,
    metalness: 0,
    glow: "#a9e3f1",
    scatter: 0.22,
    iridescence: 0.12,
    sheen: 0,
  },
  puff: {
    roughness: 0.62,
    transmission: 0.1,
    metalness: 0,
    glow: "#ffdfb9",
    scatter: 0.48,
    iridescence: 0.05,
    sheen: 0.85,
  },
};
/** Thin-surface wrap/rim scattering approximation; not offline volumetric SSS. */
export function companionSkin(id: CompanionId, lightweight = false) {
  const p = skinProfiles[id],
    clock = { value: 0 },
    glow = new THREE.Color(p.glow);
  const skin = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: p.roughness,
    metalness: p.metalness,
    transmission: lightweight ? 0 : p.transmission,
    transparent: lightweight,
    opacity:
      look.materialOpacity * (lightweight ? (id === "water" ? 0.87 : 0.96) : 1),
    thickness: id === "water" ? 0.45 : 0.8,
    ior: id === "water" ? 1.33 : 1.38,
    attenuationColor: p.glow,
    attenuationDistance: 2.8,
    iridescence: p.iridescence,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [100, 380],
    sheen: p.sheen,
    sheenColor: p.glow,
    sheenRoughness: 0.7,
    clearcoat: id === "water" ? 0.5 : 0.16,
    clearcoatRoughness: 0.32,
    specularIntensity: 0.45,
  });
  skin.userData.clock = clock;
  skin.userData.lightweight = lightweight;
  skin.userData.profile = p;
  skin.onBeforeCompile = (shader) => {
    shader.uniforms.uCompanionTime = clock;
    shader.vertexShader =
      "varying vec3 vCompanionLocal;\nuniform float uCompanionTime;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>\nvCompanionLocal=position;${id === "water" ? "transformed.x+=sin(position.y*13.0+uCompanionTime*3.0)*.006;" : ""}`,
    );
    shader.fragmentShader =
      "varying vec3 vCompanionLocal;\nuniform float uCompanionTime;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
   float mist=.5+.19*sin(vCompanionLocal.x*8.0+vCompanionLocal.y*7.0+uCompanionTime*.18)+.16*sin(vCompanionLocal.z*13.0-vCompanionLocal.y*9.0-uCompanionTime*.11);
   ${id === "aurora" ? "diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.25,.15,.48),vec3(.08,.55,.44),mist),.5);" : ""}
   ${id === "nebula" ? "diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.35,.38,.64),mist*.13);" : ""}
  `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+sin(vCompanionLocal.x*211.0)*sin(vCompanionLocal.y*173.0)*.018,.06,1.0);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
   float fresnel=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),2.5);
   float wrap=pow(max(dot(-normal,normalize(vec3(-.45,.65,.25))),0.0),2.0);
   vec3 glowTint=vec3(${glow.r.toFixed(5)},${glow.g.toFixed(5)},${glow.b.toFixed(5)});
   outgoingLight+=glowTint*(fresnel*.24+wrap*.12+.025)*${((p.scatter * look.subsurfaceAppearance) / 0.35).toFixed(3)};
   ${["nebula", "stardust", "mushroom"].includes(id) ? `vec3 cell=floor(vCompanionLocal*42.0);float seed=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);float sparkle=(1.0-smoothstep(.09,.19,length(fract(vCompanionLocal*42.0)-.5)))*step(.94,seed);outgoingLight+=vec3(${id === "stardust" ? ".85,.66,.34" : ".45,.56,.7"})*sparkle*(.7+.3*sin(uCompanionTime*.8+seed*40.0));` : ""}
   #include <opaque_fragment>`,
    );
  };
  skin.customProgramCacheKey = () => `companion-gel-v2-${id}-${lightweight}`;
  return skin;
}
