import { CHAIR, inDeskObstacle, WALK_RADIUS } from "./terrain";
/** Reserve body clearance around the table/backrest and the shore. */
export function safeDrop(x: number, z: number): [number, number] {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return [-0.72, 0.12];
  const radius = Math.hypot(x, z);
  if (radius > WALK_RADIUS) {
    x *= WALK_RADIUS / radius;
    z *= WALK_RADIUS / radius;
  }
  const blocked = (a: number, b: number) =>
    inDeskObstacle(a, b, 0.5) ||
    (Math.abs(a - CHAIR.x) < 0.95 && b < CHAIR.z + 0.68 && b > CHAIR.z - 0.95);
  if (!blocked(x, z)) return [x, z];
  let best: [number, number] = [-0.72, 0.12],
    distance = Infinity;
  for (let a = -WALK_RADIUS; a <= WALK_RADIUS; a += 0.1)
    for (let b = -WALK_RADIUS; b <= WALK_RADIUS; b += 0.1) {
      const d = (a - x) ** 2 + (b - z) ** 2;
      if (Math.hypot(a, b) <= WALK_RADIUS && !blocked(a, b) && d < distance) {
        best = [a, b];
        distance = d;
      }
    }
  return best;
}
