import type { Action } from "../domain";
export interface ArtPose {
  scaleY: number;
  pitch: number;
  roll: number;
  yaw: number;
  lift: number;
  armRaise: number;
  armForward: number;
  leftLeg: number;
  rightLeg: number;
  eyeOpen: number;
  antenna: number;
  seated: number;
  leftArmSwing: number;
  rightArmSwing: number;
  leftFootLift: number;
  rightFootLift: number;
  happyEyes: number;
  mouthOpen: number;
  smile: number;
}
export const neutralPose: ArtPose = {
  scaleY: 1,
  pitch: 0,
  roll: 0,
  yaw: 0,
  lift: 0,
  armRaise: 0.04,
  armForward: 0,
  leftLeg: 0,
  rightLeg: 0,
  eyeOpen: 1,
  antenna: 0,
  seated: 0,
  leftArmSwing: 0, rightArmSwing: 0,
  leftFootLift: 0, rightFootLift: 0,
  happyEyes: 0, mouthOpen: 0, smile: .15,
};
export function poseFor(action: Action, time: number, gaitTime = time): ArtPose {
  const p = { ...neutralPose };
  const moving = ["walk", "approach", "return"].includes(action);
  const cycle = gaitTime * 7.1;
  p.scaleY = 1 + Math.sin(time * 1.8) * 0.008;
  if (moving) {
    p.leftLeg = -Math.sin(cycle) * 0.48;
    p.rightLeg = -p.leftLeg;
    p.leftFootLift = Math.max(0,Math.sin(cycle))*.030;
    p.rightFootLift = Math.max(0,-Math.sin(cycle))*.030;
    p.leftArmSwing = Math.sin(cycle)*.48;
    p.rightArmSwing = -Math.sin(cycle)*.48;
    p.roll = Math.sin(cycle) * 0.055;
    p.lift = (1 - Math.cos(cycle * 2)) * 0.009;
    p.armRaise = .10;
    p.smile = .35;
    p.pitch = 0.025;
  }
  if (action === "read") {
    p.pitch = 0.085 + Math.sin(time * 0.8) * 0.008;
    p.armForward = Math.sin(time * 0.65) * 0.012;
    p.seated = 1;
    p.armRaise = 0.04;
    p.eyeOpen = 0.82;
    p.smile = .1;
    p.yaw = Math.sin(time * 0.45) * 0.018;
  }
  if (action === "rest") {
    p.scaleY = 0.94 + Math.sin(time * 0.8) * 0.006;
    p.pitch = 0.1;
    p.eyeOpen = 0.12;
    p.armRaise = -0.08;
    p.antenna = 0.09;
    p.smile = 0;
  }
  if (action === "happy") {
    const bounce = Math.max(0, Math.sin(time * 5));
    p.lift = bounce * 0.12;
    p.scaleY = 1 + Math.sin(time * 5 - 0.5) * 0.025;
    p.armRaise = 1.20;
    p.happyEyes = 1;
    p.mouthOpen = .75;
    p.smile = 1;
    p.leftLeg = -0.12;
    p.rightLeg = 0.12;
    p.antenna = Math.sin(time * 5 - 1) * 0.12;
  }
  if (action === "listen") {
    p.yaw = Math.sin(time * 0.8) * 0.13;
    p.roll = 0.045;
    p.pitch = -0.025;
    p.eyeOpen = 1.08;
    p.smile = .55;
    p.armRaise = .20;
    p.antenna = 0.04;
  }
  if (action === "stretch") {
    p.scaleY = 1.06 + Math.sin(time * 1.2) * 0.005;
    p.armRaise = 1.30;
    p.mouthOpen = .85;
    p.smile = .15;
    p.armForward = 0.12;
    p.eyeOpen = 0.65;
    p.antenna = -0.08;
  }
  const blink = time % 5.8;
  const openness = blink < 0.16 ? Math.abs(blink - 0.08) / 0.08 : 1;
  if (action !== "rest") p.eyeOpen *= Math.max(0.06, openness);
  return p;
}
export function blendPose(current: ArtPose, target: ArtPose, delta: number) {
  const dt = Math.max(0, Math.min(delta, 0.08));
  for (const key of Object.keys(current) as (keyof ArtPose)[]) {
    const rate = key === "eyeOpen" ? 30 : 8;
    current[key] += (target[key] - current[key]) * (1 - Math.exp(-rate * dt));
  }
  return current;
}
