import {expect,it} from "vitest";
import {advanceWalkingSpeed,headingFromStep,turnToward,faceVisibleFrom} from "../src/art/locomotion";
import {poseFor} from "../src/art/character-animation";
it("faces actual travel in every cardinal direction and keeps its heading when stopped",()=>{
 for(const [x,z] of [[0,-1],[0,1],[-1,0],[1,0]]){
  const yaw=headingFromStep(.35,x,z);expect(Math.sin(yaw)*x+Math.cos(yaw)*z).toBeCloseTo(1);
 }
 expect(headingFromStep(2.4,0,0)).toBe(2.4);
 expect(turnToward(Math.PI-.05,-Math.PI+.05,.1)).toBeGreaterThan(Math.PI-.05);
 expect(faceVisibleFrom(-1)).toBe(false);expect(faceVisibleFrom(1)).toBe(true);
});
it("walking has visible opposing arms and legs, lift and distance-driven phase",()=>{
 const a=poseFor("walk",0,.22),b=poseFor("walk",0,.66);
 expect(Math.abs(a.leftLeg-b.leftLeg)).toBeGreaterThan(.85);
 expect(a.leftLeg).toBe(-a.rightLeg);expect(a.leftArmSwing).toBe(-a.rightArmSwing);
 expect(a.leftLeg*a.leftArmSwing).toBeLessThan(0);
 expect(a.leftFootLift).toBeGreaterThan(.025);
 expect(poseFor("walk",6,.22).leftLeg).toBe(a.leftLeg);
});
it("actions have distinguishable facial controls",()=>{
 expect(poseFor("happy",1).happyEyes).toBe(1);expect(poseFor("happy",1).mouthOpen).toBeGreaterThan(.5);
 expect(poseFor("stretch",1).mouthOpen).toBeGreaterThan(.5);
 expect(poseFor("rest",1).eyeOpen).toBeLessThan(.2);
 expect(poseFor("listen",1).smile).toBeGreaterThan(poseFor("idle",1).smile);
});

it("ramps up a ground walk and slows near the destination", () => {
  const fastFrame = advanceWalkingSpeed(0, .82, 3, 1 / 60);
  expect(fastFrame).toBeGreaterThan(0);
  expect(fastFrame).toBeLessThan(.1);
  let regular = 0;
  for (let frame = 0; frame < 18; frame++) regular = advanceWalkingSpeed(regular, .82, 3, 1 / 60);
  let slower = 0;
  for (let frame = 0; frame < 6; frame++) slower = advanceWalkingSpeed(slower, .82, 3, .05);
  expect(regular).toBeCloseTo(slower);
  expect(advanceWalkingSpeed(.82, .82, .08, .05)).toBeLessThan(.82);
});
