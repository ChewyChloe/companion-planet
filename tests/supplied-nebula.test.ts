import { it, expect } from "vitest";
import { readFileSync } from "node:fs";

it("ships the supplied skinned Nebula with finite, usable animation transforms", () => {
  const bytes=readFileSync("public/models/user-residents/nebula.glb");
  const length=bytes.readUInt32LE(12), g=JSON.parse(bytes.subarray(20,20+length).toString());
  expect(bytes.length).toBeLessThan(7_000_000);
  expect(g.skins).toHaveLength(1);
  expect(g.animations.map((a:any)=>a.name).sort()).toEqual(["AntennaSway","Bounce","Walk","Wave"]);
  const primitive=g.meshes[0].primitives[0];
  expect(g.accessors[primitive.indices].count/3).toBeGreaterThan(40_000);
  expect(g.accessors[primitive.indices].count/3).toBeLessThan(60_000);
  expect(primitive.attributes.JOINTS_0).toBeDefined();
  expect(primitive.attributes.WEIGHTS_0).toBeDefined();
  for(const clip of g.animations)for(const channel of clip.channels){
    const a=g.accessors[clip.samplers[channel.sampler].output],view=g.bufferViews[a.bufferView];
    const components=channel.target.path==="rotation"?4:3;
    const offset=28+length+(view.byteOffset||0)+(a.byteOffset||0);
    for(let i=0;i<a.count;i++){
      const values=Array.from({length:components},(_,c)=>bytes.readFloatLE(offset+i*(view.byteStride||components*4)+c*4));
      expect(values.every(Number.isFinite),clip.name).toBe(true);
      if(channel.target.path==="rotation")expect(Math.hypot(...values),clip.name).toBeCloseTo(1,3);
      if(channel.target.path==="scale")expect(Math.min(...values),clip.name).toBeGreaterThan(.5);
    }
  }
});

it("keeps arm animations near the visible rest pose instead of folding them into the body", () => {
  const b=readFileSync("public/models/user-residents/nebula.glb"),length=b.readUInt32LE(12);
  const g=JSON.parse(b.subarray(20,20+length).toString());
  for(const clip of g.animations)for(const channel of clip.channels){
    const node=g.nodes[channel.target.node];
    if(channel.target.path!=="rotation" || !["Hand.L","Hand.R"].includes(node.name))continue;
    const a=g.accessors[clip.samplers[channel.sampler].output],v=g.bufferViews[a.bufferView];
    const offset=28+length+(v.byteOffset||0)+(a.byteOffset||0);
    expect(a.count).toBeGreaterThan(1);
    for(let i=0;i<a.count;i++){
      const q=Array.from({length:4},(_,c)=>b.readFloatLE(offset+i*16+c*4));
      const dot=Math.abs(q.reduce((s,x,j)=>s+x*node.rotation[j],0));
      expect(dot,`${clip.name} ${node.name}`).toBeGreaterThan(Math.cos(.9/2));
    }
  }
});
