import { Reflector } from "three/addons/objects/Reflector.js";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
const vertexShader = `uniform mat4 textureMatrix;varying vec4 vMirror;varying vec3 vWorld;void main(){vMirror=textureMatrix*vec4(position,1.);vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`;
const fragmentShader = `uniform sampler2D tDiffuse;uniform vec2 resolution;uniform float time;uniform vec3 nearColor;uniform vec3 farColor;varying vec4 vMirror;varying vec3 vWorld;
void main(){float y=gl_FragCoord.y/resolution.y;if(y>.42)discard;float wave=sin(vWorld.z*19.+sin(vWorld.x*.7)+time*.32)*.003+sin(vWorld.z*7.-time*.17)*.004;
vec3 color=mix(nearColor,farColor,clamp(y*2.7,0.,1.))+wave;
vec4 mirrorUV=vMirror;mirrorUV.x+=sin(vWorld.z*13.+time*.25)*.003*mirrorUV.w;vec4 reflection=texture2DProj(tDiffuse,mirrorUV);color=mix(color,reflection.rgb,clamp(reflection.a,0.,1.)*.34);
float alpha=(1.-smoothstep(.20,.42,y))*.98;gl_FragColor=vec4(color,alpha);
#include <colorspace_fragment>
}`;
function Lake({ reduced }: { reduced: boolean }) {
  const { gl } = useThree();
  const reduce = useRef(reduced);
  reduce.current = reduced;
  const lake = useMemo(() => {
    const mirror = new Reflector(new THREE.PlaneGeometry(180, 180), {
      textureWidth: 512,
      textureHeight: 256,
      multisample: 0,
      clipBias: 0.004,
      shader: {
        uniforms: {
          tDiffuse: { value: null },
          color: { value: new THREE.Color("#ffffff") },
          textureMatrix: { value: new THREE.Matrix4() },
          time: { value: 0 },
          resolution: { value: new THREE.Vector2(1, 1) },
          nearColor: { value: new THREE.Color("#b2bed8") },
          farColor: { value: new THREE.Color("#e5cdd3") },
        },
        vertexShader,
        fragmentShader,
      },
    });
    mirror.name = "Lake";
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = -0.14;
    mirror.renderOrder = 2;
    const material = mirror.material as THREE.ShaderMaterial;
    material.transparent = true;
    material.depthWrite = false;
    material.toneMapped = false;
    const render = mirror.onBeforeRender,
      lastPosition = new THREE.Vector3(Infinity, 0, 0),
      lastProjection = new THREE.Matrix4();
    let last = -Infinity;
    mirror.onBeforeRender = (...args) => {
      args[0].getDrawingBufferSize(material.uniforms.resolution.value);
      const camera = args[2],
        now = performance.now();
      if (
        now - last > (reduce.current ? 2000 : 700) ||
        camera.position.distanceToSquared(lastPosition) > 0.002 ||
        !camera.projectionMatrix.equals(lastProjection)
      ) {
        last = now;
        lastPosition.copy(camera.position);
        lastProjection.copy(camera.projectionMatrix);
        render.apply(mirror, args);
      }
    };
    return mirror;
  }, []);
  useFrame((state) => {
    const material = lake.material as THREE.ShaderMaterial;
    gl.getDrawingBufferSize(material.uniforms.resolution.value);
    material.uniforms.time.value = reduced ? 0 : state.clock.elapsedTime;
  });
  useEffect(
    () => () => {
      lake.dispose();
      lake.geometry.dispose();
    },
    [lake],
  );
  return <primitive object={lake} />;
}
export function Coast({ reduced }: { reduced: boolean }) {
  return (
    <>
      <fog attach="fog" args={["#c8c3d8", 20, 45]} />
      <group name="LakesideHorizon">
        <Lake reduced={reduced} />
        {[
          [-4.6, -0.14, -0.5, 2.4, 0.65, 2.0, "#a9b49f"],
          [0.4, -0.14, -2.4, 3.0, 0.55, 2.3, "#b3b6ac"],
          [6, -0.14, -8, 3.5, 0.25, 2.2, "#b6b2cc"],
          [12, -0.14, -12, 4.2, 0.2, 2.7, "#bbb6d0"],
        ].map(([x, y, z, sx, sy, sz, color], i) => (
          <mesh
            key={i}
            name={`DistantHill${i}`}
            position={[Number(x), Number(y), Number(z)]}
            scale={[Number(sx), Number(sy), Number(sz)]}
          >
            <sphereGeometry
              args={[1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial color={String(color)} roughness={1} />
          </mesh>
        ))}
      </group>
    </>
  );
}
