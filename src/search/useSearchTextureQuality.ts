import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, type Object3D } from "three";
import { usesMobileSafariRendering } from "../art/mobile-safari";

export function useSearchTextureQuality(model: Object3D) {
  const gl = useThree((state) => state.gl);
  useLayoutEffect(() => {
    if (usesMobileSafariRendering()) return;
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    if (anisotropy <= 1) return;
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        for (const texture of [material.map, material.normalMap, material.roughnessMap]) {
          if (!texture || texture.anisotropy >= anisotropy) continue;
          texture.anisotropy = anisotropy;
          texture.needsUpdate = true;
        }
      }
    });
  }, [gl, model]);
}
