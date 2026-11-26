import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import * as THREE from "three";
import { planets, planetFor, type PlanetId } from "../planets";
import { useWorld } from "../store";
function paintPlanet(id: PlanetId) {
  const shape = new THREE.SphereGeometry(1, 96, 64);
  const positions = shape.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const noise = new ImprovedNoise();
  const base = new THREE.Color(planetFor(id).color);
  const dark = base.clone().multiplyScalar(.28);
  const light = base.clone().lerp(new THREE.Color("#f4ead4"), .68);
  const color = new THREE.Color();
  const seed = planets.findIndex(planet => planet.id === id) * 17;
  const craters = Array.from({ length: 24 }, (_, i) => {
    const y = 1 - 2 * (i + .5) / 24;
    const angle = i * 2.399963 + seed;
    const ring = Math.sqrt(1 - y * y);
    return {
      center: new THREE.Vector3(ring * Math.cos(angle), y, ring * Math.sin(angle)),
      radius: .085 + .22 * ((i * 7 % 19) / 18),
    };
  });
  const direction = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + seed, y = positions.getY(i), z = positions.getZ(i);
    const sample = (frequency: number) => noise.noise(x * frequency, y * frequency, z * frequency);
    const terrain = sample(2.3) + .45 * sample(5) + .25 * sample(11) + .14 * sample(23);
    direction.fromBufferAttribute(positions, i).normalize();
    let relief = .045 * terrain + .012 * sample(28);
    let basin = 0;
    for (const crater of craters) {
      const r = direction.distanceTo(crater.center) / crater.radius;
      const bowl = 1 - THREE.MathUtils.smoothstep(r, .15, .95);
      const rim = Math.exp(-((r - .97) ** 2) / .018);
      relief += crater.radius * (.16 * rim - .32 * bowl);
      basin = Math.max(basin, bowl);
    }
    const radius = 1 + relief;
    positions.setXYZ(i, direction.x * radius, direction.y * radius, direction.z * radius);
    color.copy(dark).lerp(base, .68 + .22 * terrain - .22 * basin)
      .lerp(light, THREE.MathUtils.smoothstep(terrain, .02, .58) * .46);
    color.toArray(colors, i * 3);
  }
  shape.computeVertexNormals();
  shape.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return shape;
}
export const destinationPositions = [
  [12, 37],
  [68, 9],
  [88, 37],
] as const;

function Destination({ id, index }: { id: PlanetId; index: number }) {
  const root = useRef<THREE.Group>(null);
  const halo = useRef<THREE.ShaderMaterial>(null);
  const { camera, gl } = useThree();
  const geometry = useMemo(() => paintPlanet(id), [id]);
  const other = useMemo(() => new THREE.Vector3(), []);
  useFrame((_state, delta) => {
    if (!root.current) return;
    const [left, top] = destinationPositions[index];
    const x = left / 50 - 1, y = 1 - top / 50;
    const aspect = (camera as THREE.PerspectiveCamera).aspect;
    const radius = Math.min([.096, .075, .113][index], .18 * aspect);
    // Use a camera-facing plane behind the island even when the viewer zooms out.
    // Both samples share its depth, so the projected diameter stays the same.
    const depth = camera.position.length() + 28;
    const center = root.current.position.set(x, y, 0).applyMatrix4(camera.projectionMatrixInverse);
    const depthScale = depth / -center.z;
    center.multiplyScalar(depthScale).applyMatrix4(camera.matrixWorld);
    other.set(x, y + radius, 0).applyMatrix4(camera.projectionMatrixInverse)
      .multiplyScalar(depthScale).applyMatrix4(camera.matrixWorld);
    const hovered = useWorld.getState().hoveredPlanet === id;
    const scale =
      other.distanceTo(root.current.position) * (hovered ? 1.15 : 1);
    root.current.scale.setScalar(THREE.MathUtils.damp(root.current.scale.x, scale, 16, Math.min(delta, .1)));
    if (halo.current)
      halo.current.uniforms.strength.value = hovered ? 0.35 : 0.16;
    root.current.quaternion.copy(camera.quaternion);
    gl.domElement.dataset[`planet${index}`] =
      `${id},${left / 100},${top / 100}`;
  });
  return (
    <group
      ref={root}
      scale={0}
      name={`Destination-${id}`}
      onPointerOver={(e) => {
        if (e.intersections[0]?.object !== e.object) return;
        e.stopPropagation();
        useWorld.getState().hoverPlanet(id);
        gl.domElement.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        useWorld.getState().hoverPlanet(null);
        gl.domElement.style.cursor = "auto";
      }}
      onClick={(e) => {
        if (e.intersections[0]?.object !== e.object) return;
        e.stopPropagation();
        if (e.delta < 6) useWorld.getState().visit(id);
      }}
    >
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.83} fog={false} />
      </mesh>
      <mesh scale={1.32} raycast={() => null}>
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
    for (let i = 0; i < 1600; i++) {
      const t = i * 2.399963,
        y = 1 - (2 * (i + 0.5)) / 1600,
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
        <shaderMaterial
          transparent
          depthWrite={false}
          vertexShader={`
            varying float sizeSeed;
            void main() {
              sizeSeed = fract(sin(dot(position, vec3(1.7, 3.1, 5.3))) * 43758.5);
              gl_PointSize = sizeSeed > .91 ? 9. + 8. * sizeSeed : 2. + 2. * sizeSeed;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
            }
          `}
          fragmentShader={`
            varying float sizeSeed;
            void main() {
              vec2 p = abs(2. * gl_PointCoord - 1.);
              float core = exp(-23. * dot(p,p));
              float rays = exp(-42. * min(p.x,p.y)) * pow(max(0., 1. - max(p.x,p.y)), 2.4);
              float light = sizeSeed > .91 ? max(core, rays * .75) : core * (.4 + .55 * sizeSeed);
              gl_FragColor = vec4(mix(vec3(.60,.74,1.),vec3(1.,.76,.45),sizeSeed),light);
              #include <colorspace_fragment>
            }
          `}
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
