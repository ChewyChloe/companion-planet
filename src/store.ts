import type { TapMood } from "./tap-dialogue";
import { planetFor, type PlanetId } from "./planets";
import { create } from "zustand";
import {
  addFocusRecord, defaultTimerSettings, editStage, initialTimer, nextStage,
  normalizeTimerSettings, resetStage, restoreTimer, resume, tick,
  type Timer, type Action, type FocusRecord, type TimerSettings,
} from "./domain";
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
  timerSettings: TimerSettings;
  focusRecords: FocusRecord[];
  updateTimerSettings: (changes: Partial<TimerSettings>) => void;
  editTimer: (milliseconds: number) => void;
  advanceTimer: (now: number) => Timer | null;
  timerCommand: (command: "start" | "pause" | "reset" | "skip", now: number, stage?: "focus" | "break") => void;
  reaction: Action | null;
  reactionUntil: number;
  setTimer: (t: Timer) => void;
  setSilent: (b: boolean) => void;
  setReduced: (b: boolean) => void;
  timerGesture: { action: Action; until: number } | null;
  cueTimerGesture: (action: Action, ms: number) => void;
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
const settings = normalizeTimerSettings(saved.timerSettings ?? { focusMinutes: saved.focusMinutes, sound: saved.notifications !== false });
const restoredAt = Date.now();
const snapshot = restoreTimer(saved.timer, restoredAt, settings, false);
const restored = saved.timer ? tick(snapshot, restoredAt, settings) : resetStage(initialTimer, settings);
const savedRecords: FocusRecord[] = Array.isArray(saved.focusRecords) ? saved.focusRecords.filter(
  (record: FocusRecord) => record && typeof record.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.day)
    && Number.isFinite(record.milliseconds) && record.milliseconds > 0,
) : [];
const recoveredRecords = restored.completed > snapshot.completed ? addFocusRecord(savedRecords, snapshot, settings) : savedRecords;

export const useWorld = create<State>((set, get) => ({
  timer: restored,
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
  timerSettings: settings,
  focusRecords: recoveredRecords,
  updateTimerSettings: (changes) => set(s => {
    const timerSettings = normalizeTimerSettings({ ...s.timerSettings, ...changes });
    const timer = s.timer.running || s.timer.started || s.timer.custom ? s.timer : resetStage(s.timer, timerSettings);
    return { timerSettings, timer };
  }),
  editTimer: (milliseconds) => set(s => ({ timer: editStage(s.timer, milliseconds) })),
  advanceTimer: (now) => {
    const { timer, timerSettings, focusRecords } = get();
    const next = tick(timer, now, timerSettings);
    if (timer === next) return null;
    if (timer.deadline !== null && now >= timer.deadline) {
      set({
        timer: next,
        focusRecords: next.completed > timer.completed ? addFocusRecord(focusRecords, timer, timerSettings) : focusRecords,
      });
      return timer;
    }
    if (Math.ceil(next.remaining / 1000) !== Math.ceil(timer.remaining / 1000)) set({ timer: next });
    return null;
  },
  timerCommand: (command, now, stage) => set(s => {
    const { timer, timerSettings } = s;
    if (command === "reset") return { timer: resetStage(timer, timerSettings) };
    if (command === "skip") return { timer: nextStage(timer, timerSettings, false) };
    if (command === "pause") return timer.running
      ? { timer: { ...timer, remaining: Math.max(1, timer.deadline! - now), running: false, deadline: null } }
      : {};
    if (timer.running) return {};
    const prepared = stage && (timer.phase === "break") !== (stage === "break")
      ? resetStage({ ...timer, phase: stage === "break" ? "break" : "idle", breakKind: "short" }, timerSettings)
      : timer;
    return { timer: resume(prepared, now) };
  }),
  reaction: null,
  reactionUntil: 0,
  setTimer: (timer) => set({ timer }),
  setSilent: (silent) => set({ silent }),
  setReduced: (reduced) => set({ reduced }),
  timerGesture: null,
  cueTimerGesture: (action, ms) => set({ timerGesture: { action, until: Date.now() + ms } }),
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
      timerSettings: { ...defaultTimerSettings },
      focusRecords: [],
      timerGesture: null,
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
    s.timerSettings !== previous.timerSettings;
  const timerChanged =
    s.timer.running !== previous.timer.running ||
    s.timer.deadline !== previous.timer.deadline;
  if (!preferenceChanged && s.timer === previous.timer && s.focusRecords === previous.focusRecords) return;
  if (
    s.timer.running &&
    !preferenceChanged &&
    !timerChanged &&
    Date.now() - lastPersist < 900
  )
    return;
  persist(s);
});
function persist(s: State) {
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
        timerSettings: s.timerSettings,
        focusRecords: s.focusRecords,
      }),
    );
  } catch {
    /* Memory-only when storage is unavailable. */
  }
}
// Hydration can settle exactly one elapsed stage without replaying a notification.
if (restored.completed !== snapshot.completed || restored.phase !== snapshot.phase) persist(useWorld.getState());
