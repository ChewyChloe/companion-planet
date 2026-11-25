import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import * as THREE from "three";
import { planets, planetFor, type PlanetId } from "../planets";
import { useWorld } from "../store";
function paintPlanet(id: PlanetId) {
  const shape = new THREE.SphereGeometry(1, 64, 40);
  const positions = shape.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const noise = new ImprovedNoise();
  const base = new THREE.Color(planetFor(id).color);
  const dark = base.clone().multiplyScalar(.28);
  const light = base.clone().lerp(new THREE.Color("#f4ead4"), .68);
  const color = new THREE.Color();
  const seed = planets.findIndex(planet => planet.id === id) * 17;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + seed, y = positions.getY(i), z = positions.getZ(i);
    const sample = (frequency: number) => noise.noise(x * frequency, y * frequency, z * frequency);
    const terrain = sample(2.3) + .45 * sample(5) + .25 * sample(11) + .14 * sample(23);
    const clouds = THREE.MathUtils.smoothstep(sample(4) + .35 * sample(12), .14, .57);
    color.copy(dark).lerp(base, THREE.MathUtils.smoothstep(terrain, -.32, .32)).lerp(light, clouds * .68);
    color.toArray(colors, i * 3);
  }
  shape.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return shape;
}
function Destination({ id, index }: { id: PlanetId; index: number }) {
  const root = useRef<THREE.Group>(null);
  const halo = useRef<THREE.ShaderMaterial>(null);
  const { camera, gl } = useThree();
  const geometry = useMemo(() => paintPlanet(id), [id]);
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
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.83} />
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
