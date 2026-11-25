import { load } from "../scripts/calibrate-user-worlds.mjs";
import transforms from "../assets/art/user-models/RUNTIME_TRANSFORMS.json";
import { registerWorldCollision } from "../src/art/world-collision";
import { expect, it } from "vitest";
import { Vector3 } from "three";
import { configureLandmarkNavigation, HOME, navigationLanding, waypoint } from "../src/art/terrain";

it.each([["b612",-.71,4.48],["forest",.68,4.53]] as const)("connects %s steps to the walking terrace", (id, stairX, stairZ) => {
  const scene=load(id);
  const transform=transforms[id];
  scene.scale.setScalar(transform.scale);
  scene.rotation.y=transform.rotationY;
  scene.position.fromArray(transform.translation);
  registerWorldCollision(id,scene);
  configureLandmarkNavigation(id);
  const [x,z]=navigationLanding(stairX,stairZ);
  const goal=new Vector3(x,0,z);
  const [spawnX,spawnZ]=navigationLanding(HOME[0],HOME[1]);
  const position=new Vector3(spawnX,0,spawnZ), next=new Vector3();
  expect(goal.distanceTo(new Vector3(stairX,0,stairZ))).toBeLessThan(.25);
  for(let i=0;i<1200 && position.distanceTo(goal)>.07;i++){
    waypoint(position,goal,next);
    position.lerp(next,Math.min(1,.04/Math.max(.001,position.distanceTo(next))));
  }
  expect(position.distanceTo(goal)).toBeLessThan(.08);
  configureLandmarkNavigation("b612");
}, 25000);
