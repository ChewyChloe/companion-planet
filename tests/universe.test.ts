import { it, expect } from "vitest";
import * as THREE from "three";
import { planetFor, planets } from "../src/planets";
import { safeDrop } from "../src/art/placement";
import {
  WALK_RADIUS,
  groundHeight,
  createRockGeometry,
  waypoint,
  inDeskObstacle,
} from "../src/art/terrain";
import {
  companionSkin,
  skinProfiles,
  shouldUseThinShell,
} from "../src/art/companion-skin";
it("provides distinct worlds and expands usable terrain beyond the previous island", () => {
  expect(new Set(planets.map((p) => p.landmark)).size).toBe(4);
  expect(planetFor("__proto__").id).toBe("b612");
  expect(WALK_RADIUS ** 2 / 1.85 ** 2).toBeGreaterThan(5);
  expect(safeDrop(3, 2.5)).toEqual([3, 2.5]);
  expect(groundHeight(0, 0)).toBeGreaterThan(groundHeight(4, 0));
});
it("rock shell never rises above the curved walking surface to form a bowl wall", () => {
  const g = createRockGeometry(),
    p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++)
    expect(p.getY(i)).toBeLessThanOrEqual(
      groundHeight(p.getX(i), p.getZ(i)) + 0.001,
    );
  g.dispose();
});
it("routes to either side of the desk without getting stuck at a corner", () => {
  for (const goal of [
    [2.6, 2.7],
    [-3, -1],
    [0.72, 0.23],
  ]) {
    const from = new THREE.Vector3(-0.72, 0, 0.12),
      target = new THREE.Vector3(goal[0], 0, goal[1]),
      next = new THREE.Vector3();
    for (let i = 0; i < 450 && from.distanceTo(target) > 0.05; i++) {
      waypoint(from, target, next);
      from.lerp(next, 0.15);
      expect(inDeskObstacle(from.x, from.z, 0.25)).toBe(false);
    }
    expect(from.distanceTo(target)).toBeLessThan(0.06);
  }
});
it("gives all nine functional skin profiles with real full-quality transmission and a lightweight fallback", () => {
  for (const id of Object.keys(skinProfiles) as (keyof typeof skinProfiles)[]) {
    const full = companionSkin(id),
      small = companionSkin(id, true);
    expect(full.transmission).toBeGreaterThan(0);
    expect(full.roughness).toBe(skinProfiles[id].roughness);
    expect(small.transmission).toBe(0);
    expect(small.opacity).toBeLessThan(1);
    expect(full.customProgramCacheKey()).not.toBe(
      small.customProgramCacheKey(),
    );
    full.dispose();
    small.dispose();
  }
  expect(shouldUseThinShell(844, true, "Apple GPU")).toBe(true);
  expect(shouldUseThinShell(1366, false, "SwiftShader")).toBe(true);
  expect(shouldUseThinShell(1366, false, "Hardware GPU")).toBe(false);
  expect(skinProfiles.water.roughness).toBe(0.1);
  expect(skinProfiles.aurora.iridescence).toBeGreaterThan(0.5);
  expect(skinProfiles.puff.sheen).toBeGreaterThan(0.7);
});
