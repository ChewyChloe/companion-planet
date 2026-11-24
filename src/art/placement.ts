import { CHAIR, inDeskObstacle } from "./terrain";
/** Reserve body clearance around the table/backrest and the shore. */
export function safeDrop(x: number, z: number): [number, number] {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return [-0.72, 0.12];
  const radius = Math.hypot(x, z);
  if (radius > 1.85) {
    x *= 1.85 / radius;
    z *= 1.85 / radius;
  }
  const blocked = (a: number, b: number) =>
    inDeskObstacle(a, b, 0.5) ||
    (Math.abs(a - CHAIR.x) < 0.95 && b < CHAIR.z + 0.68 && b > CHAIR.z - 0.95);
  if (!blocked(x, z)) return [x, z];
  let best: [number, number] = [-0.72, 0.12],
    distance = Infinity;
  for (let a = -1.8; a <= 1.8; a += 0.1)
    for (let b = -1.8; b <= 1.8; b += 0.1) {
      const d = (a - x) ** 2 + (b - z) ** 2;
      if (Math.hypot(a, b) <= 1.85 && !blocked(a, b) && d < distance) {
        best = [a, b];
        distance = d;
      }
    }
  return best;
}
