import { describe, expect, it } from "vitest";
import {
  addFocusRecord, dailyFocus, defaultTimerSettings, editStage, initialTimer, localDay,
  nextStage, normalizeTimerSettings, resetStage, restoreTimer, resume, tick,
} from "../src/domain";

const settings = defaultTimerSettings;
const minute = 60_000;

describe("Pomodoro phases", () => {
  it("takes three short breaks and a long break after the fourth completed focus", () => {
    let timer = resetStage(initialTimer, settings);
    let now = 1000;
    for (let round = 1; round <= 4; round++) {
      timer = resume(timer, now);
      expect(timer).toMatchObject({ phase: "focus", remaining: 25 * minute });
      now += timer.remaining;
      timer = tick(timer, now, settings);
      const long = round === 4;
      expect(timer).toMatchObject({
        phase: "break", breakKind: long ? "long" : "short", round, completed: round,
        remaining: (long ? 15 : 5) * minute, running: false,
      });
      timer = resume(timer, now);
      now += timer.remaining;
      timer = tick(timer, now, settings);
      expect(timer).toMatchObject({ phase: "idle", round: long ? 0 : round, completed: round });
    }
  });

  it("uses only the elapsed portion of the next stage when auto-start is enabled", () => {
    const automatic = { ...settings, autoStart: true };
    const focus = resume(initialTimer, 1000);
    const after = tick(focus, focus.deadline! + minute, automatic);
    expect(after).toMatchObject({ phase: "break", running: true, remaining: 4 * minute, completed: 1 });
    expect(after.deadline).toBe(focus.deadline! + 5 * minute);
    const reopened = restoreTimer(focus, focus.deadline! + 60 * minute, automatic);
    expect(reopened).toMatchObject({ phase: "break", running: true, remaining: 5 * minute, completed: 1 });
  });

  it("edits only a paused or ready stage and keeps configured defaults", () => {
    const preset = normalizeTimerSettings({ focusMinutes: 35, longEvery: 3 });
    const ready = resetStage(initialTimer, preset);
    const custom = editStage(ready, 92_000);
    expect(custom).toMatchObject({ remaining: 92_000, custom: true, duration: 92_000 });
    const running = resume(custom, 1000);
    expect(editStage(running, 6000)).toBe(running);
    const paused = { ...running, running: false, deadline: null, remaining: 72_000 };
    expect(editStage(paused, 5000)).toMatchObject({ remaining: 5000, duration: 25_000 });
    expect(resetStage(paused, preset).remaining).toBe(35 * minute);
    expect(tick(running, running.deadline!, preset).remaining).toBe(5 * minute);
  });

  it("counts only completed rounds and records the local day of expiry once", () => {
    const at = new Date(2026, 10, 27, 0, 0, 5).getTime();
    const timer = resume(editStage(initialTimer, 10_000), at - 10_000);
    expect(nextStage(timer, settings, false).completed).toBe(0);
    expect(resetStage(timer, settings).completed).toBe(0);
    expect(tick(timer, at, settings).completed).toBe(1);
    const records = addFocusRecord([], timer, settings);
    expect(addFocusRecord(records, timer, settings)).toBe(records);
    expect(dailyFocus(records).get(localDay(at))).toEqual({ count: 1, minutes: 10 / 60 });
    expect(dailyFocus(records).has(localDay(at - 10_000))).toBe(false);
  });
});
