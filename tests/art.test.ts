import { it, expect } from "vitest";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import {
  poseFor,
  blendPose,
  neutralPose,
} from "../src/art/character-animation";
import {
  createShoreGeometry,
  createSoilGeometry,
  groundHeight,
  groundNormal,
  inDeskObstacle,
  waypoint,
  CHAIR,
  HOME,
} from "../src/art/terrain";
import { advanceBehavior, initialBehavior } from "../src/behavior";
import type { Action } from "../src/domain";
it("exports a skinned continuous body and all semantic controls", () => {
  const bytes = readFileSync("public/models/nebula-sculpt.glb");
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  const n = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + n).toString());
  const names = gltf.nodes.map((n: { name: string }) => n.name);
  for (const name of [
    "CharacterRoot",
    "Body",
    "Belly",
    "LeftEye",
    "RightEye",
    "Mouth",
    "LeftCheek",
    "RightCheek",
    "LeftAntenna",
    "RightAntenna",
    "LeftArm",
    "RightArm",
    "LeftLeg",
    "RightLeg",
  ])
    expect(names).toContain(name);
  expect(gltf.skins).toHaveLength(1);
  expect(gltf.extensionsUsed || []).not.toContain("EXT_meshopt_compression");
  expect(gltf.extensionsUsed || []).not.toContain("KHR_draco_mesh_compression");
  const body = gltf.nodes.find((n: { name: string }) => n.name === "Body");
  expect(body.skin).toBe(0);
  const attrs = gltf.meshes[body.mesh].primitives[0].attributes;
  expect(attrs.JOINTS_0).toBeDefined();
  expect(attrs.WEIGHTS_0).toBeDefined();
  expect(attrs.COLOR_0).toBeDefined();
  expect(gltf.meshes[body.mesh].extras.targetNames).toContain("Seated");
  expect(gltf.meshes[body.mesh].primitives[0].targets[0].NORMAL).toBeDefined();
});
it("blends every animation transition continuously, with bounded finite transforms", () => {
  const actions: Action[] = [
    "idle",
    "walk",
    "read",
    "rest",
    "happy",
    "listen",
    "stretch",
    "approach",
    "return",
  ];
  for (const from of actions)
    for (const to of actions) {
      const previous = poseFor(from, 0.7);
      const copy = { ...previous };
      const next = blendPose(copy, poseFor(to, 0.7), 1 / 60);
      for (const key of Object.keys(next) as (keyof typeof next)[]) {
        expect(Number.isFinite(next[key])).toBe(true);
        expect(Math.abs(next[key] - previous[key])).toBeLessThan(0.45);
      }
    }
  expect(poseFor("read", 1).pitch).toBeGreaterThan(0.05);
  expect(poseFor("rest", 1).eyeOpen).toBeLessThan(0.2);
  expect(poseFor("walk", 1).leftLeg).toBe(-poseFor("walk", 1).rightLeg);
  expect(blendPose({ ...neutralPose }, poseFor("stretch", 1), 0)).toEqual(
    neutralPose,
  );
});
it("grounds all station legs and keeps autonomous destinations outside furniture", () => {
  const h = groundHeight(CHAIR.x, CHAIR.z);
  for (const x of [-0.59, 0.59])
    for (const z of [
      CHAIR.deskZ - 0.28,
      CHAIR.deskZ + 0.28,
      CHAIR.rearLegZ,
      CHAIR.frontLegZ,
    ])
      expect(Math.abs(groundHeight(CHAIR.x + x, CHAIR.z + z) - h)).toBeLessThan(
        0.015,
      );
  expect(groundNormal(CHAIR.x, CHAIR.z).y).toBeGreaterThan(0.999);
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const walk = advanceBehavior(
      initialBehavior,
      "idle",
      null,
      0,
      0,
      0,
      () => t * 0.32,
    );
    if (walk.action === "walk")
      expect(inDeskObstacle(...walk.target, 0.35)).toBe(false);
  }
  const from = new THREE.Vector3(-0.65, 0, 1.25),
    target = new THREE.Vector3(CHAIR.x, 0, CHAIR.z),
    next = new THREE.Vector3();
  for (let i = 0; i < 800; i++) {
    waypoint(from, target, next);
    from.lerp(next, 0.02);
    expect(inDeskObstacle(from.x, from.z, 0.28)).toBe(false);
  }
  expect(from.distanceTo(target)).toBeLessThan(0.08);
  expect(HOME[0]).toBeLessThan(0);
});
it("routes leaving the chair around the table and sends rest to the cushion", () => {
  const from = new THREE.Vector3(CHAIR.x, 0, CHAIR.z),
    target = new THREE.Vector3(-0.65, 0, 1.25),
    next = new THREE.Vector3();
  for (let i = 0; i < 800; i++) {
    waypoint(from, target, next);
    from.lerp(next, 0.02);
    expect(inDeskObstacle(from.x, from.z, 0.28)).toBe(false);
  }
  expect(from.distanceTo(target)).toBeLessThan(0.08);
  const rest = advanceBehavior(initialBehavior, "idle", "rest", 5000, 1000, 1);
  expect(rest.target).toEqual([-1.1, 0.65]);
  expect(poseFor("idle", 0.08).eyeOpen).toBeLessThan(0.1);
  expect(poseFor("idle", 0.3).eyeOpen).toBeGreaterThan(0.9);
  expect(poseFor("read", 1).seated).toBe(1);
});
it("supports all four corners of the rotated rest pad without sinking or floating", () => {
  const centre = groundHeight(-1.1, 0.65),
    a = -0.2;
  for (const x of [-0.525, 0.525])
    for (const z of [-0.35, 0.35])
      expect(
        Math.abs(
          centre -
            groundHeight(
              -1.1 + x * Math.cos(a) + z * Math.sin(a),
              0.65 - x * Math.sin(a) + z * Math.cos(a),
            ),
        ),
      ).toBeLessThan(0.001);
});

it("keeps the actual sculpt torso round in depth, rather than a flat front cutout", () => {
  const report = JSON.parse(
    readFileSync("assets/art/model-build.json", "utf8"),
  );
  expect(report.torsoDepthToWidth).toBeGreaterThan(0.85);
  expect(report.torsoDepthToWidth).toBeLessThan(1.1);
});

it("keeps meadow and shoreline faces visible from above and submerges the outer bank", () => {
  for (const make of [createSoilGeometry, createShoreGeometry]) {
    const g = make();
    const normals = g.attributes.normal;
    let up = 0;
    for (let i = 0; i < normals.count; i++) {
      expect(normals.getY(i)).toBeGreaterThanOrEqual(-0.001);
      up += normals.getY(i);
    }
    expect(up / normals.count).toBeGreaterThan(0.6);
    expect(g.attributes.uv.count).toBe(g.attributes.position.count);
    g.dispose();
  }
  const shore = createShoreGeometry(),
    p = shore.attributes.position;
  for (let i = p.count - 97; i < p.count; i++)
    expect(p.getY(i)).toBeCloseTo(-0.24, 5);
  shore.dispose();
});
