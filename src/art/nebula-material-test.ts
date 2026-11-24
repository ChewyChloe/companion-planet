import * as THREE from "three";
export const nebulaMaterialVariants = {
  soft: { name: "A・柔霧", roughness: .46, transmission: .28, thickness: .72, scatter: .12 },
  mist: { name: "B・星雲果凍", roughness: .23, transmission: .40, thickness: .68, scatter: .16 },
  gel: { name: "C・清透果凍", roughness: .10, transmission: .65, thickness: .58, scatter: .08 },
} as const;
export type NebulaMaterialVariant = keyof typeof nebulaMaterialVariants;
export function getNebulaMaterialVariant(search = location.search): NebulaMaterialVariant | undefined {
  const value = new URLSearchParams(search).get("nebula-material");
  return value && Object.hasOwn(nebulaMaterialVariants, value) ? value as NebulaMaterialVariant : undefined;
}
export const APPROVED_NEBULA_MATERIAL: NebulaMaterialVariant = "mist";
export function resolveNebulaMaterial(id: string, search = location.search): NebulaMaterialVariant | undefined {
  return id === "nebula" ? getNebulaMaterialVariant(search) || APPROVED_NEBULA_MATERIAL : undefined;
}
/** Real MeshPhysical transmission in the browser, plus an explicitly approximate
 * mist/rim shader. No Blender render, simulated volume SSS or new animation. */
export function nebulaTestMaterial(variant: NebulaMaterialVariant, thinShell: boolean) {
  const p = nebulaMaterialVariants[variant];
  const material = new THREE.MeshPhysicalMaterial({
    color: "#ffffff", vertexColors: true, roughness: p.roughness, metalness: 0,
    transmission: thinShell ? 0 : p.transmission,
    transparent: thinShell, opacity: thinShell ? (variant === "gel" ? .84 : variant === "mist" ? .93 : .97) : 1, depthWrite: false,
    thickness: p.thickness, ior: variant === "gel" ? 1.43 : 1.38, attenuationColor: variant === "soft" ? "#d2e4f0" : "#8bbddd", attenuationDistance: variant === "soft" ? 1.1 : variant === "mist" ? 2.4 : 5,
    clearcoat: variant === "gel" ? .35 : .18, clearcoatRoughness: .18, specularIntensity: .42,
  });
  const clock = { value: 0 };
  material.userData.clock = clock;
  material.userData.lightweight = thinShell;
  material.userData.variant = variant;
  material.onBeforeCompile = shader => {
    shader.vertexShader = "varying vec3 vNebulaPoint;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvNebulaPoint=position;");
    shader.fragmentShader = "varying vec3 vNebulaPoint;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float cloud=.5+.22*sin(vNebulaPoint.x*10.0+vNebulaPoint.z*7.0)+.16*sin(vNebulaPoint.y*15.0-vNebulaPoint.z*11.0);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.34,.43,.64),cloud*${variant === "mist" ? ".17" : ".05"});`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
      float rim=pow(1.0-max(dot(normal,normalize(vViewPosition)),0.0),2.6);
      outgoingLight+=vec3(.48,.66,.82)*rim*${p.scatter.toFixed(2)};

      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => `nebula-material-depth-v2-${variant}-${thinShell}`;
  return material;
}
