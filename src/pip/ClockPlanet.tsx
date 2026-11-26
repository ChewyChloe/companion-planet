import { useGLTF } from "@react-three/drei";

export function ClockPlanet() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/pip/clock-planet.glb`);
  return <primitive object={scene} />;
}
