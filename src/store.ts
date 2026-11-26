import type { TapMood } from "./tap-dialogue";
import { planetFor, type PlanetId } from "./planets";
import { create } from "zustand";
import { initialTimer, normalizeFocusMinutes, restoreTimer, type Timer, type Action } from "./domain";
import { companionAvailable, type CompanionId } from "./companions";
type WorldMemory = Partial<
  Record<PlanetId, { lampOn: boolean; flowersBloom: boolean }>
>;
interface State {
  worldStates: WorldMemory;
  journey: { target: PlanetId; started: number } | null;
  hoveredPlanet: PlanetId | null;
  hoverPlanet: (id: PlanetId | null) => void;
  destination: { x: number; z: number; serial: number } | null;
  goTo: (x: number, z: number) => void;
  planetId: PlanetId;
  lampOn: boolean;
  flowersBloom: boolean;
  visit: (id: PlanetId) => void;
  toggleLamp: () => void;
  toggleFlowers: () => void;
  companionId: CompanionId;
  setCompanion: (id: CompanionId) => void;
  timer: Timer;
  night: boolean;
  toggleNight: () => void;
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
  tapMood: TapMood | null;
  react: (a: Action, mood?: TapMood) => void;
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
  planetId: planetFor(saved.planetId).id,
  worldStates: {
    [planetFor(saved.planetId).id]: {
      lampOn: saved.lampOn !== false,
      flowersBloom: false,
    },
  },
  journey: null,
  hoveredPlanet: null,
  hoverPlanet: (hoveredPlanet) => set({ hoveredPlanet }),
  destination: null,
  goTo: (x, z) => {
    if (Number.isFinite(x) && Number.isFinite(z))
      set({ destination: { x, z, serial: Date.now() } });
  },
  lampOn: saved.lampOn !== false,
  flowersBloom: false,
  visit: (id) =>
    set((s) =>
      s.journey || planetFor(id).id === s.planetId
        ? {}
        : {
            journey: { target: planetFor(id).id, started: Date.now() },
            hoveredPlanet: null,
          },
    ),
  toggleLamp: () =>
    set((s) => ({
      lampOn: !s.lampOn,
      worldStates: {
        ...s.worldStates,
        [s.planetId]: { lampOn: !s.lampOn, flowersBloom: s.flowersBloom },
      },
    })),
  toggleFlowers: () =>
    set((s) => ({
      flowersBloom: !s.flowersBloom,
      worldStates: {
        ...s.worldStates,
        [s.planetId]: { lampOn: s.lampOn, flowersBloom: !s.flowersBloom },
      },
    })),
  companionId: companionAvailable(saved.companionId) ? saved.companionId : "nebula",
  setCompanion: (id) => { if (companionAvailable(id)) set({ companionId: id }); },
  night: saved.night === true,
  toggleNight: () => set(s => ({ night: !s.night })),
  silent: saved.quietPreferenceVersion === 1 && saved.silent === true,
  reduced:
    saved.reduced === true ||
    (saved.reduced === undefined &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  notifications: saved.notifications !== false,
  focusMinutes: normalizeFocusMinutes(saved.focusMinutes),
  setFocusMinutes: (minutes) =>
    set((s) => {
      const focusMinutes = normalizeFocusMinutes(minutes);
      return {
        focusMinutes,
        timer: s.timer.phase === "idle"
          ? { ...s.timer, remaining: Math.round(focusMinutes * 60_000) }
          : s.timer,
      };
    }),
  reaction: null,
  reactionUntil: 0,
  setTimer: (timer) => set({ timer }),
  setSilent: (silent) => set({ silent }),
  setReduced: (reduced) => set({ reduced }),
  setNotifications: (notifications) => set({ notifications }),
  tapMood: null,
  react: (reaction, mood) => set({ reaction, reactionUntil: Date.now() + 3200, tapMood: mood ?? null }),
  clear: () => {
    set({
      timer: { ...initialTimer },
      companionId: "nebula",
      destination: null,
      worldStates: {},
      journey: null,
      hoveredPlanet: null,
      planetId: "b612",
      lampOn: true,
      flowersBloom: false,
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
    s.planetId !== previous.planetId ||
    s.lampOn !== previous.lampOn ||
    s.companionId !== previous.companionId ||
    s.night !== previous.night ||
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
        planetId: s.planetId,
        lampOn: s.lampOn,
        night: s.night,
        silent: s.silent,
        quietPreferenceVersion: 1,
        reduced: s.reduced,
        notifications: s.notifications,
        focusMinutes: s.focusMinutes,
      }),
    );
  } catch {
    /* Memory-only when storage is unavailable. */
  }
});
