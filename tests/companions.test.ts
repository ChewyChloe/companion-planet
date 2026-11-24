import { expect, it } from "vitest";
import { companions, companionFor, randomGreeting } from "../src/companions";
import { safeDrop } from "../src/art/placement";
import { inDeskObstacle, CHAIR } from "../src/art/terrain";
it("has nine distinct silhouettes and validates saved selections", () => {
  expect(new Set(companions.map((c) => c.head)).size).toBe(9);
  expect(companionFor("fern").name).toBe("蕨蕨子");
  expect(companionFor("<script>")).toBe(companions[0]);
});
it("manual greetings vary without repeating and honor quiet/focus policy", () => {
  for (const focus of [true, false])
    for (const silent of [true, false])
      for (let previous = 0; previous < (focus ? 3 : 5); previous++)
        for (const seed of [0, 0.2, 0.8, 0.99999]) {
          const next = randomGreeting(previous, silent, focus, () => seed);
          expect(next.index).not.toBe(previous);
          if (silent) expect(next.text).toBe("");
          if (focus) expect(["listen", "read", "idle"]).toContain(next.action);
        }
});
it("drops stay on dry land with body clearance around furniture", () => {
  for (let x = -5; x <= 5; x += 0.2)
    for (let z = -5; z <= 5; z += 0.2) {
      const [a, b] = safeDrop(x, z);
      expect(Math.hypot(a, b)).toBeLessThanOrEqual(1.850001);
      expect(inDeskObstacle(a, b, 0.5)).toBe(false);
      expect(
        Math.abs(a - CHAIR.x) < 0.95 &&
          b < CHAIR.z + 0.68 &&
          b > CHAIR.z - 0.95,
      ).toBe(false);
    }
  expect(safeDrop(NaN, Infinity)).toEqual([-0.72, 0.12]);
});
