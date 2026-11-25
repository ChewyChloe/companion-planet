import { it, expect } from "vitest";
import { Vector3 } from "three";
import { configureLandmarkNavigation, groundNormal, inNavigationObstacle, CHAIR } from "../src/art/terrain";
import data from "../src/art/user-world-navigation.json";

it("never rolls a resident over on sampled terrain or heightfield seams", () => {
  try {
    for (const [id, g] of Object.entries(data)) {
      configureLandmarkNavigation(id);
      for (const index of g.walkable) {
        const x = Math.floor(index / g.count) * g.step + g.origin;
        const z = (index % g.count) * g.step + g.origin;
        for (const offset of [-.074, 0, .074]) {
          const n = groundNormal(x + offset, z - offset, new Vector3());
          expect(Number.isFinite(n.x + n.y + n.z), id).toBe(true);
          expect(n.y, `${id}: ${x},${z}`).toBeGreaterThanOrEqual(Math.cos(8 * Math.PI / 180) - 1e-6);
        }
      }
    }
  } finally { configureLandmarkNavigation("b612"); }
});
it("does not give the chair's entire sides and back an unconditional obstacle exemption", () => {
  configureLandmarkNavigation("b612");
  expect(inNavigationObstacle(CHAIR.x + .65, CHAIR.z - .50, .42)).toBe(true);
});

it("converts floor-relative reading-seat measurements once", () => {
  const seats: Record<string,number>={b612:.499,moon:.52,rose:.75127,forest:.52};
  try {
    for(const [id,worldSeat] of Object.entries(seats)){
      configureLandmarkNavigation(id);
      const floor=data[id as keyof typeof data].heights;
      expect(floor.some(x=>x!==null)).toBe(true);
      expect(.14+CHAIR.seatedRootOffset,id).toBeCloseTo(worldSeat,4);
    }
  } finally {configureLandmarkNavigation("b612");}
});
