import * as THREE from "three";
import { noise3 } from "./terrain";
export function surfaceMaps(kind: "rock" | "wood" | "soil" | "cloth") {
  const size = 128;
  const color = new Uint8Array(size * size * 4),
    normal = new Uint8Array(size * size * 4);
  const colors = {
    rock: [155, 160, 157],
    wood: [211, 185, 150],
    soil: [168, 165, 137],
    cloth: [181, 174, 162],
  };
  const base = colors[kind];
  const value = (x: number, y: number) => {
    const broad = noise3(x / 14, y / 14, 3);
    if (kind === "wood")
      return (
        0.5 +
        0.16 * Math.sin(x * 0.23 + broad * 3) +
        0.12 * noise3(x / 3, y / 29, 7)
      );
    if (kind === "cloth")
      return 0.5 + 0.1 * Math.sin(x * 2.8) * Math.sin(y * 2.8) + 0.1 * broad;
    return broad * 0.6 + noise3(x / 2, y / 2, 9) * 0.4;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = value(x, y),
        nx = value(x + 1, y) - value(x - 1, y),
        ny = value(x, y + 1) - value(x, y - 1);
      for (let j = 0; j < 3; j++)
        color[i + j] = Math.max(
          0,
          Math.min(255, base[j] + (n - 0.5) * (kind === "wood" ? 20 : 28)),
        );
      color[i + 3] = 255;
      normal[i] = 128 - nx * 70;
      normal[i + 1] = 128 - ny * 70;
      normal[i + 2] = 250;
      normal[i + 3] = 255;
    }
  const map = new THREE.DataTexture(color, size, size);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(kind === "wood" ? 2 : 4, kind === "wood" ? 1 : 4);
  map.needsUpdate = true;
  const normalMap = new THREE.DataTexture(normal, size, size);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.copy(map.repeat);
  normalMap.needsUpdate = true;
  return { map, normalMap };
}
