import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";
import { Vector3, Ray, Triangle, Mesh, type Object3D } from "three";
const worlds = new Map<string, Octree>();
let revision = 0;
const blockedCache=new Map<string,boolean>();
const floorCache=new Map<string,number|null>();
const probe = new Capsule(new Vector3(),new Vector3(),.36);
const capsule = new Capsule(new Vector3(), new Vector3(), .64);
export function registerWorldCollision(id: string, scene: Object3D) {
  if (worlds.has(id)) return;
  scene.updateMatrixWorld(true);
  // Imported scenery includes thin/open decorative surfaces. Collision and
  // downward support queries must work on either triangle winding.
  const tree=new Octree();
  scene.traverse(node=>{
    if(!(node instanceof Mesh))return;
    const geometry=node.geometry,positions=geometry.attributes.position,index=geometry.index;
    for(let i=0;i<(index?.count || positions.count);i+=3){
      const points=[0,1,2].map(j=>new Vector3().fromBufferAttribute(positions,index?index.getX(i+j):i+j).applyMatrix4(node.matrixWorld));
      tree.addTriangle(new Triangle(points[0],points[1],points[2]));
      tree.addTriangle(new Triangle(points[2].clone(),points[1].clone(),points[0].clone()));
    }
  });
  tree.build();worlds.set(id,tree);
  revision++;
}
export const collisionRevision = () => revision;
function body(x:number,y:number,z:number) {
  capsule.start.set(x,y+.64,z);
  capsule.end.set(x,y+1.20,z);
  return capsule;
}
export function solidBodyBlocked(id:string,x:number,y:number,z:number) {
  if(!worlds.has(id))return false;
  const key=`${id}:${Math.round(x*10)},${Math.round(y*10)},${Math.round(z*10)}`;
  const cached=blockedCache.get(key);if(cached!==undefined)return cached;
  probe.radius=id === "rose" ? .27 : .36;
  probe.start.set(x,y+.48,z);probe.end.set(x,y+1.18,z);
  const hit=worlds.get(id)!.capsuleIntersect(probe);
  const blocked=!!hit && hit.depth>.025 && (hit.normal.y<.75 || hit.depth>.22);
  blockedCache.set(key,blocked);return blocked;
}
/** Resolve against actual supplied triangles, not only a sampled heightfield. */
export function resolveBodyContact(id:string, point:Vector3) {
  const tree=worlds.get(id);if(!tree)return;
  const c=body(point.x,point.y,point.z);
  c.radius=id === "rose" ? .52 : .64;
  for(let i=0;i<5;i++){
    const hit=tree.capsuleIntersect(c);if(!hit || hit.depth<.001)break;
    const correction=hit.normal.multiplyScalar(hit.depth+.003);
    c.translate(correction);point.add(correction);
  }
}

const footNormal=new Vector3();
const footRay=new Ray(new Vector3(),new Vector3(0,-1,0));
export function contactFloor(id:string,point:Vector3):number|null {
  const key=`${id}:${Math.round(point.x*40)},${Math.round(point.y*10)},${Math.round(point.z*40)}`;
  if(floorCache.has(key))return floorCache.get(key)!;
  footRay.origin.copy(point);footRay.origin.y+=.65;
  const hit=worlds.get(id)?.rayIntersect(footRay);
  const height=!hit || hit.distance>.68 || hit.triangle.getNormal(footNormal).y<.05 ? null : footRay.origin.y-hit.distance;
  if(floorCache.size>30000)floorCache.clear();
  floorCache.set(key,height);return height;
}
