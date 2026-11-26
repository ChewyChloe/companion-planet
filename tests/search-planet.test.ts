import { describe, expect, it } from "vitest";
import { searchMotion } from "../src/search/search-motion";

describe("search planet choreography", () => {
  it("clears the shell before the search bar emerges", () => {
    expect(searchMotion(0)).toEqual({ travel: 0, shell: 0, bar: 0, veil: 0 });
    expect(searchMotion(.59)).toEqual({ travel: 1, shell: 1, bar: 0, veil: 1 });
    expect(searchMotion(.8).bar).toBeGreaterThan(0);
    expect(searchMotion(1)).toEqual({ travel: 1, shell: 1, bar: 1, veil: 1 });
  });
});
