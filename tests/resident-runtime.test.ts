import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { companions } from "../src/companions";
import { residentModelPath } from "../src/art/resident-assets";
function asset(path:string) {
  const b=readFileSync(path),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString());
  const body=g.nodes.find((x:any)=>x.name==="Body"),a=g.accessors[g.meshes[body.mesh].primitives[0].attributes.POSITION],v=g.bufferViews[a.bufferView],start=20+n+8+(v.byteOffset||0)+(a.byteOffset||0);
  return {g,body,hash:createHash("sha256").update(b.subarray(start,start+a.count*12)).digest("hex")};
}
it("nine runtime models preserve every approved clay body and are independently complete",()=>{
  const hashes=new Set();
  for(const c of companions){
    const approved=asset(`assets/art/clay-stage/${c.id}.glb`),runtime=asset(`public/${residentModelPath(c.id)}`);
    expect(runtime.hash,c.id).toBe(approved.hash);hashes.add(runtime.hash);
    const names=runtime.g.nodes.map((n:any)=>n.name);
    for(const n of ["CharacterRoot","BodyControl","LeftEye","RightEye","Mouth","LeftCheek","RightCheek","LeftAntenna","RightAntenna","LeftArm","RightArm","LeftLeg","RightLeg",`Crown-${c.id}`])expect(names,c.id).toContain(n);
    expect(runtime.body.skin).toBeDefined();expect(runtime.g.animations||[]).toHaveLength(0);
    expect(runtime.g.meshes[runtime.body.mesh].extras.targetNames).toContain("Seated");
    expect(runtime.g.images||[]).toHaveLength(0);
  }
  expect(hashes.size).toBe(9);
});
