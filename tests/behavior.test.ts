import { APPROACH, inDeskObstacle } from "../src/art/terrain";
import { it, expect } from "vitest";
import { advanceBehavior, initialBehavior } from "../src/behavior";
it("prioritizes focus and rejects distracting reactions", () => {
  const focus = advanceBehavior(initialBehavior, "focus", null, 0, 0, 1);
  expect(focus.target).toEqual([0.72, 0.23]);
  expect(focus.action).toBe("read");
  const react = advanceBehavior(focus, "focus", "happy", 5000, 1000, 2);
  expect(react.action).toBe("listen");
  expect(react.target).toEqual(focus.target);
});
it("approaches then returns smoothly through a destination, with cooldown", () => {
  const near = advanceBehavior(
    { ...initialBehavior, until: 10 },
    "idle",
    "approach",
    4200,
    1000,
    1,
  );
  expect(near.action).toBe("approach");
  expect(near.target).toEqual(APPROACH);
  expect(advanceBehavior(near, "idle", "approach", 4200, 2000, 2)).toBe(near);
  const back = advanceBehavior(near, "idle", null, 4200, 5000, 5);
  expect(back.action).toBe("return");
  expect(back.target).toEqual(initialBehavior.target);
  expect(advanceBehavior(back, "idle", null, 0, 6000, 6)).toBe(back);
});
it("uses bounded random positions and changes to stretch on break", () => {
  const walk = advanceBehavior(
    initialBehavior,
    "idle",
    null,
    0,
    0,
    0,
    () => 0.25,
  );
  expect(walk.action).toBe("walk");
  expect(walk.target[0]).toBeLessThan(1.1);
  expect(walk.target[1]).toBeGreaterThan(-0.36);
  expect(inDeskObstacle(...walk.target, 0.4)).toBe(false);
  const rest = advanceBehavior(walk, "break", null, 0, 1000, 1);
  expect(rest.action).toBe("stretch");
});
