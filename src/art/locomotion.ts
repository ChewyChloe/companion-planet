/** Heading comes from actual world-space travel, never the viewing camera. */
export function headingFromStep(previous: number, x: number, z: number) {
  return x*x+z*z > 1e-10 ? Math.atan2(x,z) : previous;
}
export function turnToward(current: number, target: number, dt: number) {
  const difference=Math.atan2(Math.sin(target-current),Math.cos(target-current));
  return current+difference*(1-Math.exp(-Math.max(0,Math.min(dt,.25))*12));
}
export function faceVisibleFrom(forwardDot: number) { return forwardDot > .06; }

/** Ramp into a walk and brake before the final destination at a frame-rate-independent rate. */
export function advanceWalkingSpeed(speed: number, cruising: number, remaining: number, dt: number) {
  const brakingDistance = .38;
  const goal = cruising * Math.min(1, Math.sqrt(Math.max(0, remaining) / brakingDistance));
  const change = goal - speed;
  const limit = (change > 0 ? 1.9 : 2.6) * dt;
  return speed + Math.min(limit, Math.max(-limit, change));
}
