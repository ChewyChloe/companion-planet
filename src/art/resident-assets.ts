import type { CompanionId } from "../companions";
export function residentModelPath(id: CompanionId) {
  return id === "nebula" ? "models/material-preview/nebula.glb" : `models/residents/${id}.glb`;
}
const faceHeights: Record<CompanionId,number> = {
  nebula:.82,sprout:.70,fern:.57,mushroom:.715,aurora:.82,blossom:.79,stardust:.785,water:.65,puff:.635,
};
export const RESIDENT_SCALE = 1.18;
export function residentFocusHeight(id: CompanionId) { return faceHeights[id] * RESIDENT_SCALE; }
export function residentSeatLift() { return 0; }
