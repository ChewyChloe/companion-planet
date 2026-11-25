import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import * as THREE from "three";
import { planets, planetFor, type PlanetId } from "../planets";
import { useWorld } from "../store";
function Destination({ id, index }: { id: PlanetId; index: number }) {
  const root = useRef<THREE.Group>(null);
  const halo = useRef<THREE.ShaderMaterial>(null);
  const { camera, gl } = useThree();
  const p = planetFor(id);
  const other = useMemo(() => new THREE.Vector3(), []);
  const positions = [
    [-0.78, 0.46],
    [0.35, 0.85],
    [0.78, 0.50],
  ];
  useFrame((_state, delta) => {
    if (!root.current) return;
    const [x, y] = positions[index];
    root.current.position.set(x, y, 0.98).unproject(camera);
    other.set(x, y + [0.045, 0.032, 0.055][index], 0.98).unproject(camera);
    const hovered = useWorld.getState().hoveredPlanet === id;
    const scale =
      other.distanceTo(root.current.position) * (hovered ? 1.15 : 1);
    root.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 1-Math.exp(-Math.min(delta,.1)*16));
    if (halo.current)
      halo.current.uniforms.strength.value = hovered ? 0.35 : 0.16;
    root.current.quaternion.copy(camera.quaternion);
    gl.domElement.dataset[`planet${index}`] =
      `${id},${(x + 1) / 2},${(1 - y) / 2}`;
  });
  return (
    <group
      ref={root}
      scale={0}
      name={`Destination-${id}`}
      onPointerOver={(e) => {
        e.stopPropagation();
        useWorld.getState().hoverPlanet(id);
        gl.domElement.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        useWorld.getState().hoverPlanet(null);
        gl.domElement.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 6) useWorld.getState().visit(id);
      }}
    >
      <mesh>
        <sphereGeometry args={[1, 32, 24]} />
        <meshPhysicalMaterial
          color={p.color}
          roughness={0.42}
          transparent
          opacity={0.9}
          depthWrite={false}
          thickness={0.25}
          iridescence={0.3}
          clearcoat={0.2}
        />
      </mesh>
      <mesh scale={1.32}>
        <sphereGeometry args={[1, 32, 20]} />
        <shaderMaterial
          ref={halo}
          transparent
          depthWrite={false}
          uniforms={{ strength: { value: 0.16 } }}
          vertexShader="varying vec3 vNormal;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}"
          fragmentShader="uniform float strength;varying vec3 vNormal;varying vec3 vView;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.);gl_FragColor=vec4(1.,.86,.72,rim*strength);}"
        />
      </mesh>
    </group>
  );
}
export function Cosmos() {
  const id = useWorld((s) => s.planetId);
  const stars = useMemo(() => {
    const a = [];
    for (let i = 0; i < 360; i++) {
      const t = i * 2.399963,
        y = 1 - (2 * (i + 0.5)) / 360,
        r = Math.sqrt(1 - y * y);
      a.push(Math.cos(t) * r * 65, y * 65, Math.sin(t) * r * 65);
    }
    return new Float32Array(a);
  }, []);
  return (
    <group name="B612Universe">
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#f5e8cf"
          size={0.075}
          transparent
          opacity={0.65}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      {planets
        .filter((p) => p.id !== id)
        .map((p, i) => (
          <Destination key={p.id} id={p.id} index={i} />
        ))}
    </group>
  );
}
