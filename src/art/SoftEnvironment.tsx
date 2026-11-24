import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
export function SoftEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl),
      room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0, 0.1, 100, { size: 64 });
    const previous = scene.environment;
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.32;
    room.dispose();
    pmrem.dispose();
    return () => {
      scene.environment = previous;
      environment.dispose();
    };
  }, [gl, scene]);
  return null;
}
