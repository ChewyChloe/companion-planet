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
      "fern",
    );
    useWorld.getState().setCompanion("aurora");
    expect(useWorld.getState().companionId).toBe("fern");
    useWorld.getState().setCompanion("water");
    expect(JSON.parse(memory.get("companion-planet-v1")!).companionId).toBe("water");
    useWorld.getState().setCompanion("sprout");
    expect(JSON.parse(memory.get("companion-planet-v1")!).companionId).toBe("sprout");
    useWorld.getState().updateTimerSettings({ focusMinutes: 1 });
    expect(JSON.parse(memory.get("companion-planet-v1")!).timerSettings.focusMinutes).toBe(1);
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

it("hydrates and records an expired focus exactly once across page reloads", async () => {
  const key = "companion-planet-v1";
  const memory = new Map<string, string>();
  const now = Date.now();
  memory.set(key, JSON.stringify({
    timer: { phase: "focus", running: true, deadline: now - 2000, remaining: 10_000, duration: 10_000, started: true, completed: 0 },
  }));
  vi.stubGlobal("localStorage", {
    getItem: (name: string) => memory.get(name) ?? null,
    setItem: (name: string, value: string) => memory.set(name, value),
  });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
  try {
    for (let reload = 0; reload < 2; reload++) {
      vi.resetModules();
      const { useWorld } = await import("../src/store");
      const state = useWorld.getState();
      expect(state.timer).toMatchObject({ phase: "break", completed: 1, running: false });
      expect(state.focusRecords).toHaveLength(1);
      expect(state.advanceTimer(now)).toBeNull();
    }
  } finally {
    vi.unstubAllGlobals();
  }
});
