import { describe, expect, it } from "vitest";
import { searchPlanets } from "../src/search/search-data";

describe("search planet demo index", () => {
  it("matches a shared topic and narrows it with another word", async () => {
    expect((await searchPlanets("散步")).map(({ title }) => title)).toEqual(["同頻星球", "微風森林"]);
    expect((await searchPlanets("  散步　瀑布  ")).map(({ title }) => title)).toEqual(["微風森林"]);
  });

  it("finds a colloquial term even when it differs from the display title", async () => {
    expect(await searchPlanets("番茄鐘")).toEqual([
      expect.objectContaining({ title: "星球鐘", description: expect.any(String), url: expect.stringMatching(/^https:/u) }),
    ]);
  });

  it("returns an empty list for blank and unmatched queries", async () => {
    expect(await searchPlanets("　 ")).toEqual([]);
    expect(await searchPlanets("銀河航線")).toEqual([]);
  });
});
