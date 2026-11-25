export const skyVertexShader = `
varying vec3 vWorld;
varying vec3 vClip;
void main() {
  vWorld = (modelMatrix * vec4(position, 1.)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
  vClip = gl_Position.xyw;
}
`;

export const skyFragmentShader = `
uniform vec3 upper, middle, horizon;
uniform float night, aspect;
varying vec3 vWorld, vClip;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float billows(vec2 p) {
  return .53 * noise(p) + .25 * noise(p * 2.08) +
         .14 * noise(p * 4.23) + .08 * noise(p * 8.17);
}

void main() {
  vec3 ray = normalize(vWorld - cameraPosition);
  vec2 uv = vClip.xy / vClip.z * .5 + .5;
  vec2 motion = .17 * vec2(ray.x + ray.z, ray.z - ray.x);
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec3 c = mix(horizon, middle, smoothstep(0., .62, uv.y));
  c = mix(c, upper, smoothstep(.29, 1., uv.y));

  // Keep the luminous dust above the island, with world-space drift on orbit.
  float band = uv.y - (.57 + .52 * uv.x);
  vec2 dustPosition = vec2(p.x * 7.5, band * 27.) + motion;
  float dust = billows(dustPosition);
  float offset = (band + .09 * (dust - .5)) / .102;
  float lane = exp(-offset * offset);
  float filament = smoothstep(.34, .79, dust);
  c += lane * filament * mix(vec3(.24,.31,.53), vec3(.064,.118,.26), night);
  float sparkle = hash(floor(vec2(p.x,uv.y) * 1040.));
  c += pow(sparkle, 64.) * (.018 + .14 * lane * filament);

  // Two banks at different apparent depths, each with an irregular silhouette.
  float edge = abs(uv.x * 2. - 1.);
  float crest = .035 + .35 * pow(edge, 2.8);
  vec2 farCloud = vec2(p.x * 8.3, uv.y * 10.) + motion * .48;
  float farDensity = billows(farCloud + 27.) - .53 + (crest - uv.y) * 2.4;
  vec3 farColor = mix(vec3(.44,.49,.72), vec3(.12,.21,.40), night);
  c = mix(c, farColor, .62 * smoothstep(-.08,.16,farDensity));

  vec2 nearCloud = vec2(p.x * 7.4, uv.y * 9.) + motion * 1.1;
  float nearDensity = billows(nearCloud) - .56 + (crest - .049 - uv.y) * 2.5;
  float body = smoothstep(-.07,.13,nearDensity);
  float lining = body * (1. - smoothstep(.04,.31,nearDensity));
  lining *= .42 + .58 * noise(nearCloud * 4.7);
  vec3 shade = mix(vec3(.51,.58,.77), vec3(.105,.19,.36), night);
  vec3 silver = mix(vec3(.99,.87,.78), vec3(.72,.66,.51), night);
  c = mix(c, shade, body * .94);
  c = mix(c, silver, lining * .61);

  gl_FragColor = vec4(c,1.);
  #include <colorspace_fragment>
}
`;
