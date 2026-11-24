export const planets = [
  {
    id: "b612",
    name: "同頻星球",
    short: "同頻星球",
    color: "#b7bea1",
    tint: "#ffffff",
    accent: "#d8c6a0",
    landmark: "books",
  },
  {
    id: "rose",
    name: "玫瑰花園",
    short: "玫瑰花園",
    color: "#d0b1b9",
    tint: "#e9d4d9",
    accent: "#c28c9d",
    landmark: "roses",
  },
  {
    id: "forest",
    name: "微風森林",
    short: "微風森林",
    color: "#8dada1",
    tint: "#c5dfce",
    accent: "#90b4a0",
    landmark: "trees",
  },
  {
    id: "moon",
    name: "月光書原",
    short: "月光書原",
    color: "#b4b4cd",
    tint: "#d4d1eb",
    accent: "#b4a6ce",
    landmark: "arch",
  },
] as const;
export type PlanetId = (typeof planets)[number]["id"];
export const planetFor = (id: unknown) =>
  planets.find((p) => p.id === id) || planets[0];
