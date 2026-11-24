/** Heading comes from actual world-space travel, never the viewing camera. */
export function headingFromStep(previous: number, x: number, z: number) {
  return x*x+z*z > 1e-10 ? Math.atan2(x,z) : previous;
}
export function turnToward(current: number, target: number, dt: number) {
  const difference=Math.atan2(Math.sin(target-current),Math.cos(target-current));
  return current+difference*(1-Math.exp(-Math.max(0,Math.min(dt,.25))*12));
}
export function faceVisibleFrom(forwardDot: number) { return forwardDot > .06; }
