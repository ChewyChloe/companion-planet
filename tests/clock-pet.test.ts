import { readFileSync } from "node:fs";
import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { expect, it } from "vitest";
import { clockHandTurns, clockPath, clockRingLift, clockRingYaw, clockRingAxis, clockRingCenter, clockCenterY, fullClockLap, nextClockStop } from "../src/pip/clock-path";

it("keeps the floating resident's ring route supported by the supplied GLB", () => {
  const bytes = readFileSync("public/models/pip/clock-planet.glb");
  const length = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + length).toString());
  const views = gltf.bufferViews.map(({ byteOffset, byteLength }: { byteOffset: number; byteLength: number }) =>
    bytes.subarray(28 + length + byteOffset, 28 + length + byteOffset + byteLength));
  const faces = new Group();
  const ring = new Group();
  for (const node of gltf.nodes) {
    if (node.mesh === undefined) continue;
    const data = gltf.meshes[node.mesh].primitives[0];
    const positionAccessor = gltf.accessors[data.attributes.POSITION];
    const positions = views[positionAccessor.bufferView];
    const indexAccessor = gltf.accessors[data.indices];
    const indices = views[indexAccessor.bufferView];
    const IndexArray = indexAccessor.componentType === 5123 ? Uint16Array : Uint32Array;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions.buffer, positions.byteOffset + (positionAccessor.byteOffset || 0), positionAccessor.count * 3), 3));
    geometry.setIndex(new BufferAttribute(new IndexArray(indices.buffer, indices.byteOffset + (indexAccessor.byteOffset || 0), indexAccessor.count), 1));
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
    (node.name === "clock-ring" ? ring : faces).add(mesh);
  }
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  expect(gltf.nodes.map((node: { name: string }) => node.name)).toEqual(
    expect.arrayContaining(["clock-ring", "clock-hour", "clock-minute", "clock-pin"]),
  );
  expect(faces.children.length).toBeGreaterThan(2);
  expect(ring.children).toHaveLength(1);
  const ringCenter = new Vector3(...clockRingCenter);
  const ringAxis = new Vector3(...clockRingAxis).normalize();
  ring.position.copy(ringCenter);
  ring.children[0].position.sub(ringCenter);
  for (let i = 0; i < 96; i++) {
    const angle = i / 96 * fullClockLap;
    const point = clockPath(angle);
    ray.ray.origin.set(point.upX * .65, clockCenterY + point.upY * .65, point.z);
    ray.ray.direction.set(-point.upX, -point.upY, 0);
    const support = new Vector3(point.x, point.y, point.z);
    // The detached ornamental ring lies in front of the shell on some rays.
    const hits = ray.intersectObject(faces);
    const distances = hits.map(hit => hit.point.distanceTo(support));
    expect(Math.min(...distances), `clearance at point ${i}`).toBeLessThan(.008);
    for (const seconds of [0, 6.5, 13, 19.5, 26, 32.5, 39, 45.5]) {
      ring.rotation.set(0, clockRingYaw(seconds), 0);
      ring.rotateOnAxis(ringAxis, seconds * .29);
      ring.updateMatrixWorld(true);
      const nearestRing = ray.intersectObject(ring)[0];
      const ringHeight = nearestRing ? nearestRing.point.distanceTo(support) : 0;
      if (nearestRing && nearestRing.distance < hits[0].distance && ringHeight > .016) {
        expect(clockRingLift(angle), `ring clearance at point ${i} after ${seconds}s`).toBeGreaterThan(ringHeight + .01);
      }
    }
  }
  expect(clockPath(fullClockLap / 4).x).toBeLessThan(-.33);
  expect(clockPath(fullClockLap / 2).y).toBeLessThan(.08);
  expect(clockPath(fullClockLap * .75).x).toBeGreaterThan(.33);
});

it("varies the resident's walking distance while keeping stops away from the outer ring", () => {
  expect(nextClockStop(0, () => 0)).not.toBe(nextClockStop(0, () => .99));
  for (let angle = -1; angle < 20; angle += .19) {
    for (const roll of [0, .16, .42, .77, .99]) {
      const stop = nextClockStop(angle, () => roll);
      expect(stop - angle).toBeGreaterThanOrEqual(1.65 - 1e-8);
      expect(stop - angle).toBeLessThan(4.6);
      expect(clockRingLift(stop)).toBe(0);
    }
  }
});

it("moves the hands from the shared deadline and preserves their angle on pause and resume", () => {
  const timer = { running: true, deadline: 130_000, remaining: 120_000, duration: 120_000 };
  expect(clockHandTurns(timer, 10_000)).toEqual({ minute: 0, hour: 0 });
  const atPause = clockHandTurns(timer, 25_000);
  expect(atPause).toEqual({ minute: .25, hour: 1 / 48 });
  expect(clockHandTurns({ ...timer, running: false, remaining: 105_000, deadline: null }, 45_000))
    .toEqual(atPause);
  expect(clockHandTurns({ ...timer, deadline: 150_000 }, 45_000)).toEqual(atPause);
  expect(clockHandTurns({ ...timer, deadline: 150_000 }, 60_000).minute).toBe(.5);
});
