import { create } from "zustand";
import { initialTimer, restoreTimer, type Timer, type Action } from "./domain";
import { companionFor, type CompanionId } from "./companions";
interface State {
  companionId: CompanionId;
  setCompanion: (id: CompanionId) => void;
  timer: Timer;
  silent: boolean;
  reduced: boolean;
  notifications: boolean;
  focusMinutes: number;
  setFocusMinutes: (minutes: number) => void;
  reaction: Action | null;
  reactionUntil: number;
  setTimer: (t: Timer) => void;
  setSilent: (b: boolean) => void;
  setReduced: (b: boolean) => void;
  setNotifications: (b: boolean) => void;
  react: (a: Action) => void;
  clear: () => void;
}
const key = "companion-planet-v1";
function read() {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}
const saved = read();
export const useWorld = create<State>((set) => ({
  timer: restoreTimer(saved.timer, Date.now()),
  companionId: companionFor(saved.companionId).id,
  setCompanion: (id) => set({ companionId: companionFor(id).id }),
  silent: saved.silent === true,
  reduced:
    saved.reduced === true ||
    (saved.reduced === undefined &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  notifications: saved.notifications !== false,
  focusMinutes: [25, 45, 5, 1, 1 / 6].includes(saved.focusMinutes)
    ? saved.focusMinutes
    : 25,
  setFocusMinutes: (focusMinutes) => {
    if ([25, 45, 5, 1, 1 / 6].includes(focusMinutes)) set({ focusMinutes });
  },
  reaction: null,
  reactionUntil: 0,
  setTimer: (timer) => set({ timer }),
  setSilent: (silent) => set({ silent }),
  setReduced: (reduced) => set({ reduced }),
  setNotifications: (notifications) => set({ notifications }),
  react: (reaction) => set({ reaction, reactionUntil: Date.now() + 3200 }),
  clear: () => {
    set({
      timer: { ...initialTimer },
      companionId: "nebula",
      silent: false,
      reduced: false,
      notifications: true,
      focusMinutes: 25,
      reaction: null,
      reactionUntil: 0,
    });
    localStorage.removeItem(key);
  },
}));
let lastPersist = 0;
useWorld.subscribe((s, previous) => {
  const preferenceChanged =
    s.companionId !== previous.companionId ||
    s.silent !== previous.silent ||
    s.reduced !== previous.reduced ||
    s.notifications !== previous.notifications ||
    s.focusMinutes !== previous.focusMinutes;
  const timerChanged =
    s.timer.running !== previous.timer.running ||
    s.timer.deadline !== previous.timer.deadline;
  if (
    s.timer.running &&
    !preferenceChanged &&
    !timerChanged &&
    Date.now() - lastPersist < 900
  )
    return;
  lastPersist = Date.now();
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        timer: s.timer,
        companionId: s.companionId,
        silent: s.silent,
        reduced: s.reduced,
        notifications: s.notifications,
        focusMinutes: s.focusMinutes,
      }),
    );
  } catch {
    /* Memory-only when storage is unavailable. */
  }
});
