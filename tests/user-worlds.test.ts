import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {Vector3} from 'three';
import {configureLandmarkNavigation,inNavigationObstacle,waypoint,groundHeight,CHAIR,HOME} from '../src/art/terrain';import {safeDrop} from '../src/art/placement';
import report from '../assets/art/user-models/RUNTIME_TRANSFORMS.json';
it('loads four independent user landscapes without altering uploaded originals or requiring remote textures',()=>{
 const hashes=new Set();for(const [id,r] of Object.entries(report)){
  expect(createHash('sha256').update(readFileSync(r.source)).digest('hex')).toBe(r.sha256);
  const bytes=readFileSync(`public/models/user-worlds/${id}.glb`);hashes.add(createHash('sha256').update(bytes).digest('hex'));
  const n=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+n).toString());expect(g.buffers.every((b:any)=>!b.uri)).toBe(true);expect(g.images.every((b:any)=>b.bufferView!==undefined&&!b.uri)).toBe(true);
  expect(r.runtimeTriangles).toBe(r.sourceTriangles);expect(r.runtimeTriangles).toBeGreaterThan(18000);expect(r.runtimeTriangles).toBeLessThan(21000);expect(bytes.length).toBeLessThan(4000000);expect(r.walkableCells).toBeGreaterThan(200);
 }expect(hashes.size).toBe(4);
});
it('provides actual-model landing heights and collision-safe routes to the reading chair and back on all four worlds',()=>{
 try{for(const id of Object.keys(report)){
  configureLandmarkNavigation(id);expect(groundHeight(CHAIR.x,CHAIR.z)).toBeCloseTo(.14);
  const home=safeDrop(...HOME);expect(inNavigationObstacle(...home,.42),`${id} spawn`).toBe(false);
  const destinations=Array.from({length:8},(_,i)=>safeDrop(Math.cos(i*Math.PI/4)*3.7,Math.sin(i*Math.PI/4)*3.7));
  for(const [a,b] of [[home,[CHAIR.x,CHAIR.z]],[[CHAIR.x,CHAIR.z],home],...destinations.map(d=>[home,d])]){
   const from=new Vector3(a[0],0,a[1]),goal=new Vector3(b[0],0,b[1]),next=new Vector3();
   for(let frame=0;frame<800&&from.distanceTo(goal)>.05;frame++){
    waypoint(from,goal,next);from.lerp(next,.12);expect(inNavigationObstacle(from.x,from.z,.28),id).toBe(false);
   }expect(from.distanceTo(goal),`${id} ${JSON.stringify({a,b,end:from.toArray()})}`).toBeLessThan(.06);
  }
 }}finally{configureLandmarkNavigation('b612');}
});
