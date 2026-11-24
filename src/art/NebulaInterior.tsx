import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { NebulaMaterialVariant } from "./nebula-material-test";
/** A spatial, static density field inside the body, not a surface decal. */
export function NebulaInterior({ variant }: { variant: NebulaMaterialVariant }) {
  const volume = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const strength = variant === "soft" ? .28 : variant === "mist" ? 1.25 : .85;
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    uniforms: { cameraLocal: { value: new THREE.Vector3() }, density: { value: strength } },
    vertexShader: `varying vec3 localPoint;void main(){localPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `precision highp float;varying vec3 localPoint;uniform vec3 cameraLocal;uniform float density;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec3 ray=normalize(localPoint-cameraLocal);float b=dot(cameraLocal,ray),c=dot(cameraLocal,cameraLocal)-1.;float disc=b*b-c;if(disc<0.)discard;float nearT=max(0.,-b-sqrt(disc)),farT=-b+sqrt(disc);float stepT=(farT-nearT)/28.;vec3 color=vec3(0.);float alpha=0.;
      for(int i=0;i<28;i++){vec3 p=cameraLocal+ray*(nearT+(float(i)+.5)*stepT);float envelope=pow(max(0.,1.-dot(p,p)),1.6);float n=noise3(p*3.5+vec3(4,1,7))*.68+noise3(p*8.2)*.32;float cloud=smoothstep(.25,.62,n)*envelope;vec3 tint=mix(vec3(.13,.20,.52),vec3(.10,.54,.62),smoothstep(.35,.65,noise3(p*2.2+vec3(2,9,3))));tint=mix(tint,vec3(.50,.34,.67),smoothstep(.56,.76,n)*.60);float a=cloud*density*stepT*1.8;color+=(1.-alpha)*a*tint;alpha+=(1.-alpha)*a;}
      if(alpha<.002)discard;gl_FragColor=vec4(color/max(alpha,.001),alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }), [strength]);
  useEffect(() => () => material.dispose(), [material]);
  const stars = useMemo(() => Array.from({ length: 18 }, (_, i) => {
    const z=1-2*(i+.5)/18,r=Math.sqrt(1-z*z),a=i*2.399963;
    return new THREE.Vector3(Math.cos(a)*r*.255,.63+z*.31,Math.sin(a)*r*.19);
  }), []);
  useFrame(() => {
    if(volume.current) material.uniforms.cameraLocal.value.copy(volume.current.worldToLocal(camera.position.clone()));
  });
  return <group name="NebulaInterior" userData={{ spatialStars: 18, densityField: "3D raymarch 28 steps" }}>
    <mesh ref={volume} name="NebulaDensityVolume" position={[0,.63,0]} scale={[.33,.40,.265]} material={material} renderOrder={2} raycast={() => undefined}>
      <sphereGeometry args={[1,32,24]} />
    </mesh>
    {stars.map((p,i) => <mesh key={i} name={`InternalStar-${i}`} position={p} raycast={() => undefined}>
      <sphereGeometry args={[i%4===0?.008:.005,8,6]} />
      <meshBasicMaterial color={new THREE.Color(i%3===0?"#c8dcff":"#f1e6cf").multiplyScalar(3.5)} toneMapped={false} />
    </mesh>)}
  </group>;
}
/** Optional neutral calibration card behind the body, shared by A/B/C. */
export function NebulaTransmissionProbe() {
  return <group name="TransmissionReferenceCard" position={[0,.64,-.53]}>
    <mesh><planeGeometry args={[.92,1.05]} /><meshBasicMaterial color="#e8dfca" /></mesh>
    {[-2,-1,0,1,2].map(i => <mesh key={i} position={[i*.16,0,.003]}>
      <planeGeometry args={[.018,1.05]} /><meshBasicMaterial color="#6c817e" />
    </mesh>)}
  </group>;
}
