import type { CompanionId } from "../companions";
export function residentModelPath(id: CompanionId) {
  return id === "nebula" ? "models/material-preview/nebula.glb" : `models/residents/${id}.glb`;
}
const faceHeights: Record<CompanionId,number> = {
  nebula:.82,sprout:.85,fern:.57,mushroom:.715,aurora:.82,blossom:.79,stardust:.785,water:.65,puff:.635,
};
export function residentFocusHeight(id: CompanionId) { return faceHeights[id]; }
export function residentSeatLift(id: CompanionId) { return id === "fern" ? .14 : id === "puff" ? .10 : 0; }
