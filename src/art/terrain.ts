import { solidBodyBlocked, collisionRevision } from "./world-collision";
import transforms from "../../assets/art/user-models/RUNTIME_TRANSFORMS.json";
import * as THREE from "three";
import {userGround,userWalkable,userHome} from "./user-world-ground";
export const WALK_RADIUS = 7.0;
export const SURFACE_RADIUS = 4.7;
export const CHAIR = {
  x: 0.72,
  z: 0.23,
  seatHeight: transforms.b612.seatHeight,
  seatDepth: 1.2,
  seatCenterZ: 0.02,
  backZ: -0.64,
  deskZ: transforms.b612.deskDistance,
  rearLegZ: -0.50,
  frontLegZ: 0.44,
  seatedRootOffset: transforms.b612.seatHeight,
};
export const APPROACH: [number, number] = userHome("b612");
export const HOME: [number, number] = userHome("b612");
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
/** Continuous stream beds shared with the exported cliff's river mouth. */
export function riverBedDepth(x: number, z: number, planet: string) {
  if (planet === "rose") return 0;
  const forest = planet === "forest", start = forest ? .25 : planet === "moon" ? 2.4 : 2.1;
  const center = forest ? -1.95 + smoothstep(.3,4.7,z)*1.10 : planet === "moon" ? -1.5 : -1.8;
  const width = forest ? .34 : planet === "moon" ? .36 : .40;
  return .14 * Math.exp(-(((x-center)/width)**4)) * smoothstep(start,start+.4,z);
}
export function groundHeight(x: number, z: number, planet = navigationPlanet) {
  const measured=userGround(planet,x,z);
  if(measured!==null)return measured;
  return .14;
}
/** Historical generator retained for archived studies only. */
export function legacyGroundHeight(x:number,z:number,planet="b612") {
  const radius = Math.hypot(x, z);
  const hills =
    (noise3(x * 1.15, 0, z * 1.15) - 0.5) * 0.14 +
    Math.exp(-((x + 1.5) ** 2 + (z + 1.1) ** 2) / 0.35) * 0.16;
  let natural =
    0.13 +
    0.08 * (Math.sqrt(Math.max(0.001, 4.95 ** 2 - radius ** 2)) - 4.95) +
    hills;
  const shapes: Record<string, readonly [number, number]> = {
    b612: [.30, .48], moon: [.24, .62], rose: [.18, .58], forest: [.38, .40],
  };
  const shape = shapes[planet] || shapes.b612;
  natural += shape[0] * Math.exp(-((x + 2) ** 2 / 2.1 + (z + 1.4) ** 2 / 1.8))
    + shape[1] * Math.exp(-((x - 1.7) ** 2 / 2.4 + (z + 2) ** 2 / 1.7));
  const pad = Math.max(Math.abs((x - 0.72) / 0.95), Math.abs((z - 0.58) / 1.6));
  const station = 0.14 + (natural - 0.14) * smoothstep(0.8, 1.25, pad);
  const dx = x + 1.1,
    dz = z - 0.65,
    a = -0.2;
  const rest = Math.max(
    Math.abs((Math.cos(a) * dx - Math.sin(a) * dz) / 0.65),
    Math.abs((Math.sin(a) * dx + Math.cos(a) * dz) / 0.47),
  );
  return 0.11 + (station - 0.11) * smoothstep(1, 1.45, rest) - riverBedDepth(x,z,planet);
}
/** The forest bridge is a real support surface, while soil stays below its water channel. */
export function walkingHeight(x: number, z: number) {
  return groundHeight(x,z);
}
export function groundNormal(x: number, z: number, out = new THREE.Vector3()) {
  const h = 0.20;
  out
    .set(
      -(walkingHeight(x + h, z) - walkingHeight(x - h, z)) / (2 * h),
      1,
      -(walkingHeight(x, z + h) - walkingHeight(x, z - h)) / (2 * h),
    )
    .normalize();
  // A resident keeps balance on its feet; terrain derivatives must not roll the
  // whole creature onto a cliff, a chair seam, or a missing heightfield cell.
  const maxSlope = Math.tan(8 * Math.PI / 180);
  const slope = Math.hypot(out.x, out.z) / Math.max(out.y, 1e-6);
  if (slope > maxSlope) {
    out.x *= maxSlope / slope;
    out.z *= maxSlope / slope;
  }
  return out.normalize();
}
export function inDeskObstacle(x: number, z: number, margin = 0) {
  return (
    x > -0.03 - margin &&
    x < 1.47 + margin &&
    z > CHAIR.z + CHAIR.deskZ - 0.4 - margin &&
    z < CHAIR.z + CHAIR.deskZ + 0.4 + margin
  );
}
/** Conservative shared landmark footprints keep all four islands walkable. */
export const LANDMARK_FOOTPRINTS: Record<string,readonly (readonly [number,number,number])[]> = {
 b612:[[-2.15,-1.2,1.0],[1.7,-2,1.35],[3.1,.6,.38],[1.75,1.9,.30],[2.65,-.3,.55]],
 moon:[[-2.1,-1.1,1.1],[1.65,-2,1.35]],
 rose:[[-2.45,.6,.80],[1.45,-2.2,1.70],[-1.95,2.2,.78],[2.55,-.3,.60]],
 forest:[[-2,-1.35,1.1],[1.8,-1.9,1.25],[2.8,-.1,.75]],
};
let navigationPlanet='b612';
let boarding=false;
export function configureLandmarkNavigation(id:string) {
 const fitted=transforms[id as keyof typeof transforms];
 CHAIR.deskZ=fitted.deskDistance;CHAIR.seatHeight=fitted.seatHeight;CHAIR.seatedRootOffset=fitted.seatHeight;
 if(id===navigationPlanet)return;navigationPlanet=id;grid=null;route=[];HOME.splice(0,2,...userHome(id));APPROACH.splice(0,2,...userHome(id));
}
export function inNavigationObstacle(x:number,z:number,margin=0) {
 // Reading chair must remain reachable by the planner, while manual drops reserve it.
 const station = Math.abs(x-CHAIR.x)<.26 && z>CHAIR.z-.12 && z<CHAIR.z+.85;
 const chairBack = Math.abs(x-CHAIR.x)<.80+margin*.25 && z>CHAIR.z-.95-margin*.25 && z<CHAIR.z-.23+margin*.25;
 return chairBack || (!station && !(boarding && Math.hypot(x-CHAIR.x,z-CHAIR.z)<1.8) && solidBodyBlocked(navigationPlanet,x,groundHeight(x,z),z)) || inDeskObstacle(x,z,margin) || (!station && !userWalkable(navigationPlanet,x,z,Math.max(0,margin-.30)));

}
const NAV_STEP=.20,NAV_MARGIN=.42;
const navClear=(a:THREE.Vector3,b:THREE.Vector3)=>{
 const steps=Math.max(2,Math.ceil(a.distanceTo(b)/.025));
 let previous=groundHeight(a.x,a.z);
 for(let i=1;i<=steps;i++){
  const x=a.x+(b.x-a.x)*i/steps,z=a.z+(b.z-a.z)*i/steps,h=groundHeight(x,z);
  if(inNavigationObstacle(x,z,NAV_MARGIN)||Math.abs(h-previous)>.09 + .75*a.distanceTo(b)/steps)return false;
  previous=h;
 }
 return true;
};
const routeTarget=new THREE.Vector3(Infinity,0,Infinity),routeFrom=new THREE.Vector3(Infinity,0,Infinity);
let route:THREE.Vector3[]=[];
let grid: {point:THREE.Vector3; edges:number[];reachable:boolean}[] | null=null;
let gridRevision=-1,gridBoarding=false;
function navGrid() {
 if(gridRevision!==collisionRevision() || gridBoarding!==boarding){grid=null;route=[];gridRevision=collisionRevision();gridBoarding=boarding;}
 if(grid)return grid;
 const nodes: {point:THREE.Vector3; edges:number[];reachable:boolean}[]=[],lookup=new Map<string,number>();
 const extent=Math.ceil(WALK_RADIUS/NAV_STEP);
 for(let x=-extent;x<=extent;x++)for(let z=-extent;z<=extent;z++){
  const p=new THREE.Vector3(x*NAV_STEP,0,z*NAV_STEP);
  if(Math.hypot(p.x,p.z)>WALK_RADIUS||inNavigationObstacle(p.x,p.z,NAV_MARGIN))continue;
  lookup.set(`${x},${z}`,nodes.length);nodes.push({point:p,edges:[],reachable:true});
 }
 for(const [key,i] of lookup){const [x,z]=key.split(',').map(Number);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
  if(!dx&&!dz)continue;const j=lookup.get(`${x+dx},${z+dz}`);if(j!==undefined&&navClear(nodes[i].point,nodes[j].point))nodes[i].edges.push(j);
 }}
 // Connectivity uses the same clearance and step-height rules as actual movement.
 const start=nodes.map((n,i)=>({i,d:(n.point.x-CHAIR.x)**2+(n.point.z-CHAIR.z)**2})).sort((a,b)=>a.d-b.d)[0]?.i;
 const seen=new Set<number>(),queue=start===undefined?[]:[start];
 while(queue.length){const i=queue.pop()!;if(seen.has(i))continue;seen.add(i);queue.push(...nodes[i].edges.filter(j=>!seen.has(j)));}
 nodes.forEach((n,i)=>n.reachable=seen.has(i));
 grid=nodes;return nodes;
}
/** Nearest landing on the same connected terrace as the resident's safe spawn. */
export function navigationLanding(x:number,z:number):[number,number] {
 const blocked=(a:number,b:number)=>inNavigationObstacle(a,b,.5)||(Math.abs(a-CHAIR.x)<.95&&b<CHAIR.z+.68&&b>CHAIR.z-.95);
 const target=new THREE.Vector3(x,0,z);
 const nodes=navGrid().filter(n=>n.reachable&&!blocked(n.point.x,n.point.z)).sort((a,b)=>a.point.distanceToSquared(target)-b.point.distanceToSquared(target));
 const nearest=nodes[0];if(!nearest)return [...HOME];
 if(!blocked(x,z)&&navClear(nearest.point,target))return [x,z];
 return [nearest.point.x,nearest.point.z];
}

function planRoute(from:THREE.Vector3,target:THREE.Vector3) {
 const nodes=navGrid();
 const nearest=(p:THREE.Vector3)=>nodes.map((n,i)=>({i,d:n.reachable?n.point.distanceToSquared(p):Infinity})).filter(v=>Number.isFinite(v.d)).sort((a,b)=>a.d-b.d).find(v=>navClear(p,nodes[v.i].point))?.i;
 const start=nearest(from),goal=nearest(target);if(start===undefined||goal===undefined)return [];
 const cost=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),open=new Set([start]);cost[start]=0;
 while(open.size){let current=-1,best=Infinity;for(const i of open){const score=cost[i]+nodes[i].point.distanceTo(nodes[goal].point);if(score<best){current=i;best=score;}}
  if(current===goal)break;open.delete(current);
  for(const next of nodes[current].edges){const trial=cost[current]+nodes[current].point.distanceTo(nodes[next].point);if(trial<cost[next]){cost[next]=trial;previous[next]=current;open.add(next);}}
 }
 if(!Number.isFinite(cost[goal]))return [];
 const path=[target.clone()];let at=goal;while(at!==start){path.unshift(nodes[at].point.clone());at=previous[at];if(at<0)return [];}
 path.unshift(nodes[start].point.clone());return path;
}
export function waypoint(from:THREE.Vector3,target:THREE.Vector3,out:THREE.Vector3, boardChair=false) {
 boarding=boardChair;
 try {
 if(navClear(from,target)){route=[];return out.copy(target);}
 if(routeTarget.distanceToSquared(target)>.0001||routeFrom.distanceTo(from)>.8||!route.length){route=planRoute(from,target);routeTarget.copy(target);}
 routeFrom.copy(from);
 while(route.length&&from.distanceTo(route[0])<.025)route.shift();
 for(let i=route.length-1;i>0;i--)if(navClear(from,route[i])){route.splice(0,i);break;}
 return out.copy(route[0]||from);
 } finally {boarding=false;}
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
  const rock = new THREE.Color("#b5b9a4"),
    light = new THREE.Color("#d6d0ba"),
    soil = new THREE.Color("#bcc3aa");
  const normal = new THREE.Vector3(),
    center = new THREE.Vector3(),
    color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    normal.fromBufferAttribute(positions, i).normalize();
    let dent = 0;
    for (const [x, y, z, size, depth] of craters) {
      center.set(x, y, z).normalize();
      const d = normal.distanceTo(center);
      dent -= depth * Math.exp(-((d / size) ** 4));
      dent += 0.022 * Math.exp(-(((d - size) / 0.045) ** 2));
    }
    const radius = 4.95;
    const x = normal.x * radius,
      z = normal.z * radius;
    const y =
      normal.y >= 0
        ? groundHeight(x, z) - 0.035
        : Math.min(
            0.13 + 0.35 * (normal.y * radius - radius),
            groundHeight(x, z) - 0.035,
          );
    const blend = smoothstep(-0.3, 0.2, normal.y);
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
export function createSoilGeometry(
  palette = { base: "#b0b4a2", moss: "#939f87" },
  planet = navigationPlanet,
) {
  const vertices: number[] = [],
    colors: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const rings = 48,
    sides = 128;
  for (let ring = 0; ring <= rings; ring++) {
    const r = (ring / rings) * SURFACE_RADIUS;
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const irregular = 1 + 0.018 * Math.sin(a * 7) + 0.012 * Math.sin(a * 11);
      const x = Math.cos(a) * r * irregular,
        z = Math.sin(a) * r * irregular;
      vertices.push(x, groundHeight(x, z, planet) + 0.012, z);
      uv.push(x * 0.3, z * 0.3);
      const color = new THREE.Color(palette.base).lerp(
        new THREE.Color(palette.moss),
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
  return Math.hypot(x, z) < SURFACE_RADIUS && mossBlend(x, z) > 0.46;
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
