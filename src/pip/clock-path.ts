// Raycast down onto clock-planet.glb at evenly spaced points on the crown.
// This ellipse stays inside the planet's ring and behind the clock button.
const heights = [
  .7723,.7700,.7751,.7770,.7772,.7805,.7833,.7854,.7876,.7892,.7912,.7932,.7947,.7965,.7982,.7998,
  .7995,.7977,.7963,.7958,.7947,.7938,.7923,.7904,.7881,.7860,.7838,.7813,.7781,.7780,.7759,.7716,
  .7732,.7732,.7708,.7735,.7748,.7759,.7770,.7788,.7805,.7823,.7838,.7854,.7868,.7881,.7890,.7894,
  .7896,.7893,.7886,.7878,.7865,.7850,.7833,.7816,.7798,.7777,.7761,.7746,.7734,.7725,.7697,.7719,
];

export function clockPath(angle: number) {
  const turn = Math.PI * 2;
  const sample = ((angle % turn + turn) % turn) / turn * heights.length;
  const index = Math.floor(sample) % heights.length;
  const blend = sample - Math.floor(sample);
  return {
    x: .215 * Math.cos(angle),
    y: heights[index] + (heights[(index + 1) % heights.length] - heights[index]) * blend,
    z: -.035 + .155 * Math.sin(angle),
    tangentX: -.215 * Math.sin(angle),
    tangentZ: .155 * Math.cos(angle),
  };
}
