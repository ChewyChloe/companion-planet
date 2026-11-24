import { useWorld } from "../store";
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
export function Atmosphere({ reduced }: { reduced: boolean }) {
  const { scene, gl } = useThree();
  const night = useWorld(s => s.night);
  const palette = useMemo(() => ({
    upper: new THREE.Color(night ? "#242d58" : "#9daed2"),
    middle: new THREE.Color(night ? "#4c4d77" : "#d0c1db"),
    horizon: new THREE.Color(night ? "#81748f" : "#f1d1b8"),
    water: new THREE.Color(night ? "#535876" : "#c3bdd7"),
    fog: new THREE.Color(night ? "#5f5e7c" : "#ddcbd5"),
  }), [night]);
  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        uniforms: {
          upper: { value: new THREE.Color("#888fb8") },
          middle: { value: new THREE.Color("#c2afc9") },
          horizon: { value: new THREE.Color("#f1d1b8") },
        },
        vertexShader:
          "varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}",
        fragmentShader:
          "uniform vec3 upper;uniform vec3 middle;uniform vec3 horizon;varying vec3 vWorld;void main(){float h=smoothstep(-.65,.28,normalize(vWorld-cameraPosition).y);vec3 c=mix(horizon,middle,smoothstep(0.,.55,h));c=mix(c,upper,smoothstep(.35,1.,h));gl_FragColor=vec4(c,1.);#include <colorspace_fragment>\n}".replace(
            ";#include",
            ";\n#include",
          ),
      }),
    [],
  );
  const cloud = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const c = canvas.getContext("2d")!;
    const gradient = c.createRadialGradient(64, 64, 2, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,.6)");
    gradient.addColorStop(0.35, "rgba(255,255,255,.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
  const water = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color("#c3bdd7") },
        },
        vertexShader:
          "varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}",
        fragmentShader:
          "uniform float time;uniform vec3 color;varying vec3 vWorld;void main(){float r=length(vWorld.xz);float wave=sin(vWorld.z*10.+sin(vWorld.x*.7)+time*.2)*.012;gl_FragColor=vec4(color+wave,.28*(1.-smoothstep(8.,45.,r)));\n#include <colorspace_fragment>\n}",
      }),
    [],
  );
  useEffect(() => {
    const old = scene.fog;
    scene.fog = new THREE.FogExp2("#ddcbd5", 0.019);
    return () => {
      scene.fog = old;
      sky.dispose();
      cloud.dispose();
      water.dispose();
    };
  }, [scene, sky, cloud, water]);
  useFrame((s, delta) => {
    const blend = 1 - Math.exp(-Math.min(delta,.1)*3);
    for (const key of ["upper", "middle", "horizon"] as const) sky.uniforms[key].value.lerp(palette[key], blend);
    water.uniforms.color.value.lerp(palette.water,blend);
    if (scene.fog) scene.fog.color.lerp(palette.fog,blend);
    gl.domElement.dataset.timeOfDay = night ? "night" : "day";
    water.uniforms.time.value = reduced ? 0 : s.clock.elapsedTime;
  });
  return (
    <group name="TwilightAtmosphere">
      <mesh renderOrder={-10} material={sky}>
        <sphereGeometry args={[95, 32, 20]} />
      </mesh>
      <mesh
        position={[0, -2.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={water}
      >
        <planeGeometry args={[160, 160]} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => {
        const a = i * 2.39996,
          r = 4.9 + (i % 3) * 0.6;
        return (
          <sprite
            key={i}
            position={[Math.cos(a) * r, -0.3 - (i % 3) * 0.18, Math.sin(a) * r]}
            scale={[4.5, 2.2, 1]}
            renderOrder={3}
          >
            <spriteMaterial
              map={cloud}
              color={night ? "#74708f" : i % 2 ? "#e5d9e3" : "#d8d2e3"}
              transparent
              opacity={0.6}
              depthWrite={false}
              depthTest={false}
            />
          </sprite>
        );
      })}
    </group>
  );
}
