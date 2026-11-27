import { companionName } from "../shared/dialogue.js";
import type { Action } from "./domain";
export const companions = [
  {
    id: "nebula",
    name: companionName("nebula"),
    color: "#8dbbd6",
    accent: "#c3dce8",
    head: "antenna",
  },
  {
    id: "fern",
    name: companionName("fern"),
    color: "#99b970",
    accent: "#688c46",
    head: "fern",
  },
  {
    id: "sprout",
    name: companionName("sprout"),
    color: "#e5d9ad",
    accent: "#f7e4a3",
    head: "star",
  },
  {
    id: "mushroom",
    name: companionName("mushroom"),
    color: "#e7cb83",
    accent: "#f1dfa1",
    head: "mushroom",
  },
  {
    id: "aurora",
    name: companionName("aurora"),
    color: "#9994cf",
    accent: "#99d9c5",
    head: "leaves",
  },
  {
    id: "blossom",
    name: companionName("blossom"),
    color: "#dfb1c0",
    accent: "#eac1cb",
    head: "flower",
  },
  {
    id: "stardust",
    name: companionName("stardust"),
    color: "#4c638c",
    accent: "#edce8a",
    head: "horns",
  },
  {
    id: "water",
    name: companionName("water"),
    color: "#85c6dc",
    accent: "#b8e2d6",
    head: "drop",
  },
  {
    id: "puff",
    name: companionName("puff"),
    color: "#e7c4aa",
    accent: "#efdfbf",
    head: "puff",
  },
] as const;
export type CompanionId = (typeof companions)[number]["id"];
export function companionAvailable(id: unknown): id is "nebula" | "fern" | "sprout" | "mushroom" | "water" | "puff" | "blossom" | "stardust" | "aurora" {
  return id === "nebula" || id === "fern" || id === "sprout" || id === "mushroom" || id === "water" || id === "puff" || id === "blossom" || id === "stardust" || id === "aurora";
}
export function companionFor(id: unknown) {
  return companions.find((c) => c.id === id) || companions[0];
}
export function randomGreeting(
  previous: number,
  silent: boolean,
  focus: boolean,
  random = Math.random,
) {
  const choices: { action: Action; text: string }[] = focus
    ? [
        { action: "listen", text: "我陪你慢慢來。" },
        { action: "read", text: "一起讀完這一頁吧。" },
        { action: "idle", text: "我在這裡。" },
      ]
    : [
        { action: "happy", text: "" },
        { action: "stretch", text: "" },
        { action: "listen", text: "今天想和我分享什麼？" },
        { action: "idle", text: "在這裡待一下，也很好。" },
        { action: "happy", text: "見到你真好。" },
      ];
  const index =
    (Math.floor(
      Math.max(0, Math.min(0.999999, random())) * (choices.length - 1),
    ) +
      previous +
      1) %
    choices.length;
  return { ...choices[index], text: silent ? "" : choices[index].text, index };
}
