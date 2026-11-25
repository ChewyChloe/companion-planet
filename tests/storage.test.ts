import { it, expect, vi } from "vitest";
it("persists pause and preferences immediately and clears user data", async () => {
  const memory = new Map<string, string>([["companion-planet-v1", "null"]]);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) || null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
  try {
    const { useWorld } = await import("../src/store");
    const { startTimer, pause, initialTimer } = await import("../src/domain");
    useWorld.getState().setTimer(startTimer(initialTimer, 25, Date.now()));
    useWorld.getState().setSilent(true);
    useWorld.getState().setCompanion("fern");
    expect(JSON.parse(memory.get("companion-planet-v1")!).companionId).toBe(
      "nebula",
    );
    useWorld.getState().setFocusMinutes(1);
    expect(JSON.parse(memory.get("companion-planet-v1")!).focusMinutes).toBe(1);
    expect(JSON.parse(memory.get("companion-planet-v1")!).silent).toBe(true);
    useWorld.getState().setTimer(pause(useWorld.getState().timer, Date.now()));
    expect(JSON.parse(memory.get("companion-planet-v1")!).timer.running).toBe(
      false,
    );
    useWorld.getState().clear();
    expect(memory.has("companion-planet-v1")).toBe(false);
  } finally {
    vi.unstubAllGlobals();
  }
});
