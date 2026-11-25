import { expect, it } from "vitest";
import { tapDialogue } from "../src/tap-dialogue";

it("selects all 30 ordinary lines and excludes the most recent one", () => {
  const choices=Array.from({ length: 30 }, (_, i) => tapDialogue(-1, 1, false, 12, () => (i+.5)/30));
  expect(new Set(choices.map(choice => choice.text)).size).toBe(30);
  for(const choice of choices) {
    expect(tapDialogue(choice.index, 1, false, 12, () => 0).index).not.toBe(choice.index);
    expect(tapDialogue(choice.index, 1, false, 12, () => .999).index).not.toBe(choice.index);
  }
});
it("gives tap streaks priority over focus and late-night dialogue", () => {
  expect(tapDialogue(2,3,true,1).text).toContain("腦袋");
  expect(tapDialogue(2,5,true,1).text).toContain("喜歡");
  expect(tapDialogue(2,1,true,1).text).toContain("小聲");
  expect(tapDialogue(2,1,false,1, () => .05).text).toContain("睡著");
  expect(tapDialogue(2,1,false,1, () => .05, false).index).not.toBe(2);
  expect(tapDialogue(2,1,false,1, () => .5).index).not.toBe(2);
});
