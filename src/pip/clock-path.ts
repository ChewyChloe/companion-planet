// Radial samples on the clock shell, excluding the detached decorative ring.
export const clockCenterY = .414;
const radii = [
  .3879,.3845,.3817,.3787,.3738,.3691,.3657,.3630,.3614,.3590,.3588,.3596,.3600,.3605,.3606,.3609,
  .3606,.3605,.3601,.3595,.3592,.3586,.3572,.3565,.3560,.3550,.3537,.3524,.3516,.3504,.3488,.3484,
  .3483,.3483,.3488,.3492,.3504,.3512,.3522,.3530,.3543,.3551,.3566,.3564,.3572,.3578,.3587,.3584,
  .3593,.3594,.3594,.3590,.3581,.3579,.3572,.3577,.3591,.3617,.3651,.3684,.3727,.3776,.3833,.3864,
];
export const fullClockLap = Math.PI * 2;

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
