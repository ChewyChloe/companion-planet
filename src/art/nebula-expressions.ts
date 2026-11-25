import { Vector2, type MeshPhysicalMaterial } from "three";
import type { TapMood } from "../tap-dialogue";

export const eyeOptions = ["睜眼", "開心彎眼", "閉眼", "驚訝圓眼", "下垂眼"];
export const browOptions = ["平眉", "上揚眉", "一高一低", "八字眉", "內側下壓"];
export const mouthOptions = ["微笑", "開心張嘴", "O 型嘴", "倒彎嘴", "嘟嘴"];
export type Face = readonly [leftEye: number, rightEye: number, leftBrow: number, rightBrow: number, mouth: number];

export const expressionPresets = {
  calm: { label: "平靜", face: [0,0,0,0,0] },
  happy: { label: "開心", face: [1,1,1,1,1] },
  shy: { label: "害羞", face: [1,1,0,0,0] },
  surprised: { label: "驚訝", face: [3,3,1,1,2] },
  curious: { label: "疑惑", face: [0,0,2,2,4] },
  sad: { label: "難過", face: [4,4,3,3,3] },
  pout: { label: "委屈", face: [4,4,3,3,4] },
  sleepy: { label: "睏倦", face: [2,2,0,0,0] },
  proud: { label: "得意", face: [0,0,1,1,0] },
  spaced: { label: "發呆", face: [0,0,0,0,2] },
  angry: { label: "生氣", face: [0,0,4,4,4] },
  giggle: { label: "偷笑", face: [1,1,2,2,0] },
} as const satisfies Record<string,{label:string;face:Face}>;
export type Expression = keyof typeof expressionPresets;

const moodOptions: Record<TapMood, readonly Expression[]> = {
  joy: ["happy","shy","proud","giggle"],
  sad: ["sad","pout"],
  annoyed: ["angry","pout"],
  surprise: ["surprised","spaced"],
  curious: ["curious","spaced","calm"],
  sleepy: ["sleepy","calm"],
};

export function chooseExpression(mood:TapMood, previous:Expression | null):Expression {
  const choices = moodOptions[mood].filter(expression => expression !== previous);
  return choices[Math.floor(Math.random()*choices.length)];
}

export function faceUniforms() {
  return {
    faceA: {value: [...expressionPresets.calm.face] as number[]},
    faceB: {value: [...expressionPresets.calm.face] as number[]},
    faceMix: {value:1},
    faceBlink: {value:0},
    faceGaze: {value:new Vector2()},
  };
}
type FaceUniforms = ReturnType<typeof faceUniforms>;

const facialShader = /* glsl */ `
varying vec3 nebulaRest;
uniform float faceA[5];
uniform float faceB[5];
uniform float faceMix;
uniform float faceBlink;
uniform vec2 faceGaze;
float lineShape(vec2 p,float halfWidth,float thickness,float arch) {
  float x=clamp(p.x,-halfWidth,halfWidth);
  float y=arch*(1.0-(x*x)/(halfWidth*halfWidth));
  return length(vec2(p.x-x,p.y-y))-thickness;
}
float oval(vec2 p, vec2 r) {
  return (length(p/r)-1.0)*min(r.x,r.y);
}
float eyeShape(vec2 p,float kind,float side) {
  p -= faceGaze;
  float lid=lineShape(p,.026,.004,0.0);
  float d=oval(p,vec2(.036,.039));
  if (kind>3.5) d=oval(vec2(p.x,p.y+side*p.x*.34),vec2(.034,.025));
  else if (kind>2.5) d=oval(p,vec2(.043,.043));
  else if (kind>1.5) d=lid;
  else if (kind>.5) d=lineShape(p,.032,.006,.014);
  return mix(d,lid,faceBlink);
}
float browShape(vec2 p,float kind,float side) {
  float arch=0.0;
  if (kind>3.5) p.y-=side*p.x*.54;
  else if (kind>2.5) p.y+=side*p.x*.49;
  else if (kind>1.5) p.y+=side*.014;
  else if (kind>.5) { p.y-=.015; arch=.009; }
  return lineShape(p,.034,.0045,arch);
}
float mouthShape(vec2 p,float kind) {
  if (kind>3.5) {
    vec2 q=vec2(p.y, -p.x);
    return min(lineShape(q+vec2(.010,0.0),.011,.0038,-.009),
               lineShape(q-vec2(.010,0.0),.011,.0038,-.009));
  }
  if (kind>2.5) return lineShape(p,.023,.004,.014);
  if (kind>1.5) return oval(p,vec2(.016,.020));
  if (kind>.5) return oval(vec2(p.x,p.y+.004),vec2(.032,.018));
  return lineShape(p,.022,.004,-.008);
}
float ink(float d) { return 1.0-smoothstep(-.0018,.0024,d); }
vec3 nebulaFace(vec3 skin) {
  if (nebulaRest.z<.24 || abs(nebulaRest.x)>.24 || nebulaRest.y<.46 || nebulaRest.y>.71) return skin;
  vec2 p=nebulaRest.xy;
  vec2 le=p-vec2(-.146,.544), re=p-vec2(.138,.541);
  vec2 lb=p-vec2(-.146,.619), rb=p-vec2(.138,.616);
  vec2 m=p-vec2(.003,.503);
  float eyes=max(ink(mix(eyeShape(le,faceA[0],-1.0),eyeShape(le,faceB[0],-1.0),faceMix)),
                 ink(mix(eyeShape(re,faceA[1],1.0),eyeShape(re,faceB[1],1.0),faceMix)));
  float brows=max(ink(mix(browShape(lb,faceA[2],-1.0),browShape(lb,faceB[2],-1.0),faceMix)),
                  ink(mix(browShape(rb,faceA[3],1.0),browShape(rb,faceB[3],1.0),faceMix)));
  float mouth=ink(mix(mouthShape(m,faceA[4]),mouthShape(m,faceB[4]),faceMix));
  float socket = min(length(le/vec2(.059,.061)),length(re/vec2(.059,.061)));
  float lip = length(m/vec2(.044,.028));
  float repairedSkin = 1.0-smoothstep(.79,1.23,min(socket,lip));
  vec3 smoothSkin = vec3(.24,.64,.79) + vec3(.032,.045,.050)*clamp((p.y-.5)*7.0,-1.0,1.0);
  vec3 result=mix(mix(skin,smoothSkin,repairedSkin),vec3(.012,.026,.041),eyes);
  result=mix(result,vec3(.035,.073,.098),brows);
  return mix(result,vec3(.018,.032,.049),mouth);
}
`;

/** Draw the independent facial parts in bind coordinates on the existing skin. */
export function attachNebulaFace(material:MeshPhysicalMaterial, uniforms:FaceUniforms) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader = "varying vec3 nebulaRest;\n"+shader.vertexShader.replace(
      "#include <beginnormal_vertex>", `#include <beginnormal_vertex>
      if (position.z > .25) {
        float leftPatch = length((position.xy-vec2(-.146,.544))/vec2(.068,.071));
        float rightPatch = length((position.xy-vec2(.138,.541))/vec2(.068,.071));
        float mouthPatch = length((position.xy-vec2(.003,.503))/vec2(.047,.032));
        float facePatch = 1.0-smoothstep(.82,1.20,min(min(leftPatch,rightPatch),mouthPatch));
        vec3 smoothSkin = normalize(vec3(position.x*.86,(position.y-.49)*.64,.34));
        objectNormal = normalize(mix(objectNormal,smoothSkin,facePatch));
      }`).replace(
      "#include <begin_vertex>", "#include <begin_vertex>\nnebulaRest=position;");
    shader.fragmentShader = facialShader+shader.fragmentShader.replace(
      "#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb=nebulaFace(diffuseColor.rgb);");
  };
  material.customProgramCacheKey=()=> "nebula-modular-face-v3";
}
