import { readFileSync } from "node:fs";
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { expect, it } from "vitest";
import { clockPath } from "../src/pip/clock-path";

it("keeps the floating resident's ring route supported by the supplied GLB", () => {
  const bytes = readFileSync("public/models/pip/clock-planet.glb");
  const length = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + length).toString());
  const views = gltf.bufferViews.map(({ byteOffset, byteLength }: { byteOffset: number; byteLength: number }) =>
    bytes.subarray(28 + length + byteOffset, 28 + length + byteOffset + byteLength));
  const data = gltf.meshes[0].primitives[0];
  const positions = views[gltf.accessors[data.attributes.POSITION].bufferView];
  const indices = views[gltf.accessors[data.indices].bufferView];
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions.buffer, positions.byteOffset, positions.length / 4), 3));
  geometry.setIndex(new BufferAttribute(new Uint32Array(indices.buffer, indices.byteOffset, indices.length / 4), 1));
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  expect(gltf.accessors[data.indices].count / 3).toBeLessThan(120_000);
  for (let i = 0; i < 96; i++) {
    const point = clockPath(i / 96 * Math.PI * 2);
    ray.ray.origin.set(point.x, 1.4, point.z);
    const hit = ray.intersectObject(mesh)[0];
    expect(hit, `support at point ${i}`).toBeDefined();
    expect(Math.abs(hit.point.y - point.y), `clearance at point ${i}`).toBeLessThan(.008);
    expect(Math.hypot(point.tangentX, point.tangentZ)).toBeGreaterThan(.14);
  }
});
