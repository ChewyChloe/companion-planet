import { forwardRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3 } from "three";

export const SearchBar3D = forwardRef<Group>(function SearchBar3D(_, ref) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/search/bar.glb`);
  const center = useMemo(() => new Box3().setFromObject(scene).getCenter(new Vector3()).negate(), [scene]);
  return (
    <group ref={ref} visible={false}>
      <group position={center}>
        <primitive object={scene} />
      </group>
    </group>
  );
});
