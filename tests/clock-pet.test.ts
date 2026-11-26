import { readFileSync } from "node:fs";
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { expect, it } from "vitest";
import { clockPath, clockRingLift, clockCenterY, fullClockLap } from "../src/pip/clock-path";

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
    const angle = i / 96 * fullClockLap;
    const point = clockPath(angle);
    ray.ray.origin.set(point.upX * .65, clockCenterY + point.upY * .65, point.z);
    ray.ray.direction.set(-point.upX, -point.upY, 0);
    const support = new Vector3(point.x, point.y, point.z);
    // The detached ornamental ring lies in front of the shell on some rays.
    const hits = ray.intersectObject(mesh);
    const distances = hits.map(hit => hit.point.distanceTo(support));
    expect(Math.min(...distances), `clearance at point ${i}`).toBeLessThan(.008);
    const ringHeight = .65 - hits[0].distance - Math.hypot(point.x, point.y - clockCenterY);
    if (ringHeight > .016) {
      expect(clockRingLift(angle), `ring clearance at point ${i}`).toBeGreaterThan(ringHeight + .01);
    }
  }
  expect(clockPath(fullClockLap / 4).x).toBeLessThan(-.33);
  expect(clockPath(fullClockLap / 2).y).toBeLessThan(.08);
  expect(clockPath(fullClockLap * .75).x).toBeGreaterThan(.33);
});
