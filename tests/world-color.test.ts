import {it,expect} from 'vitest';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import baseline from '../assets/art/world-color/geometry-baseline.json';
function parse(bytes:Buffer){const n=bytes.readUInt32LE(12);return {g:JSON.parse(bytes.subarray(20,20+n).toString()),b:bytes.subarray(28+n)};}
function geometryHash(g:any,b:Buffer){const p=g.meshes[0].primitives[0],hash=createHash('sha256');const data=(i:number)=>{const a=g.accessors[i],v=g.bufferViews[a.bufferView],dims:any={VEC3:3,VEC2:2,SCALAR:1},sizes:any={5126:4,5125:4,5123:2};const at=(v.byteOffset||0)+(a.byteOffset||0);return b.subarray(at,at+a.count*dims[a.type]*sizes[a.componentType]);};for(const [name,index]of Object.entries(p.attributes).sort(([a],[b])=>a.localeCompare(b))){hash.update(name);hash.update(data(index as number));}return hash.update(data(p.indices)).digest('hex');}
it('ships actual embedded albedo, packed AO/roughness/metalness and emissive textures for all four worlds',()=>{
 for(const id of Object.keys(baseline)){
  const {g,b}=parse(readFileSync(`public/models/user-worlds/${id}.glb`)),m=g.materials[0],p=m.pbrMetallicRoughness;
  expect(m.name).toBe('StorybookPaint');expect(p.metallicFactor).toBe(1);expect(p.roughnessFactor).toBe(1);
  expect(m.occlusionTexture.index).toBe(p.metallicRoughnessTexture.index);expect(m.emissiveTexture.index).not.toBe(p.baseColorTexture.index);
  for(const t of [p.baseColorTexture,p.metallicRoughnessTexture,m.normalTexture,m.emissiveTexture]){const image=g.images[g.textures[t.index].source],v=g.bufferViews[image.bufferView];expect(image.uri).toBeUndefined();expect(v.byteOffset+v.byteLength).toBeLessThanOrEqual(b.length);}
  const report=JSON.parse(readFileSync(`assets/art/world-color/${id}-paint.json`,'utf8'));
  expect(report.paintedPixels).toBeGreaterThan(2500000);const required:Record<string,string[]>={b612:['rock','grass','leaf','bark','stone','roof','wood','paper','metal','water'],moon:['rock','leaf','bark','stone','roof','cover','metal','water','moon'],rose:['rock','leaf','stone','paper','metal','water','rose'],forest:['rock','grass','leaf','bark','wood','metal','water','cloth']};for(const name of required[id])expect(report.semanticPixelCounts[name],`${id} ${name}`).toBeGreaterThan(500);
  expect(report.ambientOcclusion).toContain('Cycles');
 }
});
it('preserves exact approved scene geometry, normals, UVs and indices while changing appearance',()=>{
 for(const [id,hash]of Object.entries(baseline)){
  const {g,b}=parse(readFileSync(`public/models/user-worlds/${id}.glb`));expect(geometryHash(g,b),id).toBe(hash);
  const report=JSON.parse(readFileSync(`assets/art/world-color/${id}-paint.json`,'utf8'));expect(report.geometryHashBefore).toBe(hash);expect(report.geometryHashAfter).toBe(hash);
 }
});
