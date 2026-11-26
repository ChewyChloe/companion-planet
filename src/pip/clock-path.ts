// Radial samples on the clock shell, excluding the detached decorative ring.
export const clockCenterY = .414;
const radii = [
  .3879,.3845,.3817,.3787,.3738,.3691,.3657,.3630,.3614,.3590,.3588,.3596,.3600,.3605,.3606,.3609,
  .3606,.3605,.3601,.3595,.3592,.3586,.3572,.3565,.3560,.3550,.3537,.3524,.3516,.3504,.3488,.3484,
  .3483,.3483,.3488,.3492,.3504,.3512,.3522,.3530,.3543,.3551,.3566,.3564,.3572,.3578,.3587,.3584,
  .3593,.3594,.3594,.3590,.3581,.3579,.3572,.3577,.3591,.3617,.3651,.3684,.3727,.3776,.3833,.3864,
];
export const fullClockLap = Math.PI * 2;
const crossings = [[2.012, .176], [4.777, .158]] as const;
const crossingHalfWidth = .43;

export function clockPath(angle: number) {
  const sample = ((angle % fullClockLap + fullClockLap) % fullClockLap) / fullClockLap * radii.length;
  const index = Math.floor(sample);
  const blend = sample - index;
  const radius = radii[index] + (radii[(index + 1) % radii.length] - radii[index]) * blend;
  const upX = -Math.sin(angle);
  const upY = Math.cos(angle);
  return {
    x: radius * upX,
    y: clockCenterY + radius * upY,
    z: .175 - .06 * Math.max(0, upY) ** 8,
    upX,
    upY,
  };
}

// The tilted decorative ring crosses the walking meridian twice.
// Lead the step over it before the resident's body reaches the ring.
export function clockRingLift(angle: number) {
  const phase = ((angle % fullClockLap) + fullClockLap) % fullClockLap;
  const crossing = (center: number, height: number) => {
    const t = Math.max(0, Math.min(1, (Math.abs(phase - center) - .14) / .29));
    return height * (1 - t * t * (3 - 2 * t));
  };
  return Math.max(...crossings.map(([center, height]) => crossing(center, height)));
}

export function nextClockStop(angle: number, random = Math.random) {
  const distance = random();
  const candidate = angle + 1.65 + distance * 1.7;
  const phase = ((candidate % fullClockLap) + fullClockLap) % fullClockLap;
  for (const [center] of crossings) {
    if (Math.abs(phase - center) <= crossingHalfWidth + .06) {
      return candidate + center - phase + crossingHalfWidth + .10 + distance * .18;
    }
  }
  return candidate;
}

export function clockHandTurns(timer: {
  running: boolean;
  deadline: number | null;
  remaining: number;
  duration?: number;
}, now: number) {
  const remaining = timer.running && timer.deadline !== null
    ? Math.max(0, timer.deadline - now)
    : timer.remaining;
  const elapsed = Math.max(0, (timer.duration ?? timer.remaining) - remaining);
  return { minute: (elapsed % 60_000) / 60_000, hour: (elapsed % 720_000) / 720_000 };
}


// A slow change in the ring's inclination makes the orbit visible even on a smooth band.
export const clockRingCenter = [0, .417, 0] as const;
export const clockRingAxis = [-.230, .878, .420] as const;
export function clockRingYaw(seconds: number) {
  return .22 * Math.sin(seconds * fullClockLap / 26);
}
