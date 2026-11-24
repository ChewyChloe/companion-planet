import * as THREE from "three";
export const CHAIR = {
  x: 0.72,
  z: 0.23,
  seatHeight: 0.38,
  seatDepth: 0.9,
  seatCenterZ: -0.08,
  backZ: -0.51,
  deskZ: 0.9,
  rearLegZ: -0.4,
  frontLegZ: 0.24,
  seatedRootOffset: 0.24,
};
export const APPROACH: [number, number] = [-0.65, 1.25];
export const HOME: [number, number] = [-0.72, 0.12];
export function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function hash(x: number, y: number, z: number) {
  const a = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return a - Math.floor(a);
}
export function noise3(x: number, y: number, z: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z);
  const fx = smoothstep(0, 1, x - ix),
    fy = smoothstep(0, 1, y - iy),
    fz = smoothstep(0, 1, z - iz);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  return mix(
    mix(
      mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx),
      mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx),
      fy,
    ),
    mix(
      mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx),
      mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx),
      fy,
    ),
    fz,
  );
}
export function groundHeight(x: number, z: number) {
  const radius = Math.hypot(x, z);
  const hills =
    (noise3(x * 1.15, 0, z * 1.15) - 0.5) * 0.14 +
    Math.exp(-((x + 1.5) ** 2 + (z + 1.1) ** 2) / 0.35) * 0.16;
  const natural =
    0.13 -
    0.018 * radius * radius +
    hills -
    0.06 * smoothstep(1.9, 2.5, radius);
  const pad = Math.max(Math.abs((x - 0.72) / 0.95), Math.abs((z - 0.58) / 1.1));
  const station = 0.14 + (natural - 0.14) * smoothstep(0.8, 1.25, pad);
  const dx = x + 1.1,
    dz = z - 0.65,
    a = -0.2;
  const rest = Math.max(
    Math.abs((Math.cos(a) * dx - Math.sin(a) * dz) / 0.65),
    Math.abs((Math.sin(a) * dx + Math.cos(a) * dz) / 0.47),
  );
  return 0.11 + (station - 0.11) * smoothstep(1, 1.45, rest);
}
export function groundNormal(x: number, z: number, out = new THREE.Vector3()) {
  const h = 0.015;
  return out
    .set(
      -(groundHeight(x + h, z) - groundHeight(x - h, z)) / (2 * h),
      1,
      -(groundHeight(x, z + h) - groundHeight(x, z - h)) / (2 * h),
    )
    .normalize();
}
export function inDeskObstacle(x: number, z: number, margin = 0) {
  return (
    x > -0.03 - margin &&
    x < 1.47 + margin &&
    z > CHAIR.z + CHAIR.deskZ - 0.4 - margin &&
    z < CHAIR.z + CHAIR.deskZ + 0.4 + margin
  );
}
export function waypoint(
  from: THREE.Vector3,
  target: THREE.Vector3,
  out: THREE.Vector3,
) {
  // Route both entering and leaving the reading chair around the desk footprint.
  for (let i = 1; i < 24; i++) {
    const t = i / 24;
    if (
      inDeskObstacle(
        from.x + (target.x - from.x) * t,
        from.z + (target.z - from.z) * t,
        0.3,
      )
    )
      return out.set(-0.65, 0, 0.05);
  }
  return out.copy(target);
}
const craters = [
  [-0.8, -0.1, 1, 0.18, 0.16],
  [0.5, -0.35, 1, 0.22, 0.18],
  [-0.2, -0.8, 1, 0.2, 0.18],
  [1, -0.15, 0.15, 0.15, 0.14],
  [-1, -0.25, -0.1, 0.21, 0.16],
  [0.15, -0.45, -1, 0.18, 0.17],
  [0.5, -0.8, -0.2, 0.14, 0.12],
];
export function createRockGeometry() {
  const geometry = new THREE.SphereGeometry(1, 88, 56);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const rock = new THREE.Color("#838c8f"),
    light = new THREE.Color("#a6aca7"),
    soil = new THREE.Color("#a2a18a");
  const normal = new THREE.Vector3(),
    center = new THREE.Vector3(),
    color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    normal.fromBufferAttribute(positions, i).normalize();
    const broad =
      (noise3(normal.x * 4 + 7, normal.y * 4, normal.z * 4) - 0.5) * 0.095;
    let dent = 0;
    for (const [x, y, z, size, depth] of craters) {
      center.set(x, y, z).normalize();
      const d = normal.distanceTo(center);
      dent -= depth * Math.exp(-((d / size) ** 4));
      dent += 0.022 * Math.exp(-(((d - size) / 0.045) ** 2));
    }
    const radius = 2.7 + broad + dent;
    const x = normal.x * radius,
      z = normal.z * radius;
    const sideY = normal.y * (2.7 + broad + dent) - 0.35;
    const blend = smoothstep(0.05, 0.27, normal.y);
    const y = sideY + (groundHeight(x, z) - sideY) * blend;
    positions.setXYZ(i, x, y, z);
    color
      .copy(rock)
      .lerp(light, noise3(x * 4, y * 4, z * 4) * 0.45)
      .lerp(soil, blend * 0.8);
    color.multiplyScalar(1 + dent * 0.6);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
export function createSoilGeometry() {
  const vertices: number[] = [],
    colors: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const rings = 18,
    sides = 88;
  for (let ring = 0; ring <= rings; ring++) {
    const r = (ring / rings) * 2.43;
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const irregular = 1 + 0.018 * Math.sin(a * 7) + 0.012 * Math.sin(a * 11);
      const x = Math.cos(a) * r * irregular,
        z = Math.sin(a) * r * irregular;
      vertices.push(x, groundHeight(x, z) + 0.012, z);
      uv.push(x * 0.3, z * 0.3);
      const color = new THREE.Color("#a5a58e").lerp(
        new THREE.Color("#879b71"),
        mossBlend(x, z),
      );
      color.multiplyScalar(0.94 + noise3(x * 4, 2, z * 4) * 0.12);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let r = 0; r < rings; r++)
    for (let i = 0; i < sides; i++) {
      const p = r * (sides + 1) + i;
      indices.push(p, p + 1, p + sides + 2, p, p + sides + 2, p + sides + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function mossBlend(x: number, z: number) {
  const r = Math.hypot(x, z),
    dx = Math.max(-0.12 - x, 0, x - 1.6),
    dz = Math.max(-0.42 - z, 0, z - 1.67);
  const habitat = Math.max(
    smoothstep(0.45, 0.66, noise3(x * 2, 4, z * 2)),
    smoothstep(1.7, 2.2, r),
  );
  return (
    habitat *
    smoothstep(0.5, 0.8, r) *
    smoothstep(0, 0.18, Math.hypot(dx, dz)) *
    smoothstep(0.62, 0.8, Math.hypot(x + 1.1, z - 0.65))
  );
}
export function mossAllowed(x: number, z: number) {
  return Math.hypot(x, z) < 2.43 && mossBlend(x, z) > 0.46;
}
/** A sloping annular bank joins the existing soil to the lake below its waterline. */
export function createShoreGeometry() {
  const positions: number[] = [],
    colors: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const rings = 10,
    sides = 96;
  for (let r = 0; r <= rings; r++)
    for (let i = 0; i <= sides; i++) {
      const t = r / rings,
        a = (i / sides) * Math.PI * 2;
      const radius =
        (2.3 + t * 0.45) *
        (1 +
          0.018 * Math.sin(a * 7) +
          0.012 * Math.sin(a * 11) +
          t * 0.025 * Math.sin(a * 3));
      const x = Math.cos(a) * radius,
        z = Math.sin(a) * radius,
        blend = smoothstep(0, 1, t);
      positions.push(
        x,
        THREE.MathUtils.lerp(groundHeight(x, z), -0.24, blend),
        z,
      );
      uv.push(x * 0.3, z * 0.3);
      const c = new THREE.Color("#bbbda6").lerp(
        new THREE.Color("#b4c0b9"),
        blend * 0.45,
      );
      colors.push(c.r, c.g, c.b);
    }
  for (let r = 0; r < rings; r++)
    for (let i = 0; i < sides; i++) {
      const n = r * (sides + 1) + i;
      indices.push(n, n + 1, n + sides + 2, n, n + sides + 2, n + sides + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
