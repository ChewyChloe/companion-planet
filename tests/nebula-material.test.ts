import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getNebulaMaterialVariant, nebulaTestMaterial, resolveNebulaMaterial } from "../src/art/nebula-material-test";
it("material test requires an explicit valid variant and does not accept prototype names", () => {
  for (const q of ["", "?nebula-material=bad", "?nebula-material=toString", "?nebula-material=__proto__"])
    expect(getNebulaMaterialVariant(q)).toBeUndefined();
  expect(getNebulaMaterialVariant("?nebula-material=mist")).toBe("mist");
});
it("preview preserves the exact approved body positions and contains no animation clips", () => {
  function body(file: string) {
    const b=readFileSync(file), n=b.readUInt32LE(12), g=JSON.parse(b.subarray(20,20+n).toString());
    const node=g.nodes.find((x:any)=>x.name==="Body"), a=g.accessors[g.meshes[node.mesh].primitives[0].attributes.POSITION], v=g.bufferViews[a.bufferView];
    const start=20+n+8+(v.byteOffset||0)+(a.byteOffset||0);
    return {hash:createHash("sha256").update(b.subarray(start,start+a.count*12)).digest("hex"),count:a.count,clips:g.animations||[]};
  }
  const clay=body("assets/art/clay-stage/nebula.glb"),preview=body("public/models/material-preview/nebula.glb");
  expect(preview.hash).toBe(clay.hash);expect(preview.count).toBe(clay.count);expect(preview.clips).toHaveLength(0);
});
it("desktop uses three distinct physical materials; phone fallback explicitly disables transmission",()=>{
  const variants=["soft","mist","gel"] as const;
  const materials=variants.map(id=>nebulaTestMaterial(id,false));
  expect(materials.map(m=>m.transmission)).toEqual([.28,.72,.94]);
  expect(materials.map(m=>m.roughness)).toEqual([.46,.23,.10]);
  for(const id of variants){const m=nebulaTestMaterial(id,true);expect(m.transmission).toBe(0);expect(m.userData.lightweight).toBe(true);m.dispose();}
  materials.forEach(m=>m.dispose());
});

it("uses approved B by default only for Nebula while retaining explicit comparison routes",()=>{
  expect(resolveNebulaMaterial("nebula","")).toBe("mist");
  expect(resolveNebulaMaterial("nebula","?nebula-material=gel")).toBe("gel");
  for(const id of ["sprout","fern","mushroom","aurora","blossom","stardust","water","puff"])
    expect(resolveNebulaMaterial(id, "?nebula-material=gel")).toBeUndefined();
});
