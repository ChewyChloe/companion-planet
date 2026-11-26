export type Phase = "idle" | "focus" | "break";
export type Action =
  | "idle"
  | "walk"
  | "read"
  | "rest"
  | "happy"
  | "listen"
  | "stretch"
  | "approach"
  | "return";
export type BreakKind = "short" | "long";
export interface TimerSettings {
  focusMinutes: number;
  shortMinutes: number;
  longMinutes: number;
  longEvery: number;
  autoStart: boolean;
  sound: boolean;
  volume: number;
  desktopNotifications: boolean;
}
export const defaultTimerSettings: TimerSettings = {
  focusMinutes: 25, shortMinutes: 5, longMinutes: 15, longEvery: 4,
  autoStart: false, sound: true, volume: .55, desktopNotifications: false,
};
export interface Timer {
  phase: Phase;
  running: boolean;
  remaining: number;
  deadline: number | null;
  completed: number;
  duration?: number;
  started?: boolean;
  custom?: boolean;
  round?: number;
  breakKind?: BreakKind;
}
export interface FocusRecord { id: string; day: string; milliseconds: number }
export const initialTimer: Timer = {
  phase: "idle",
  running: false,
  remaining: 25 * 60_000,
  deadline: null,
  completed: 0,
};
const minute = 60_000;
const maxTime = 99 * minute + 59_000;
export const formatTimerPart = (value: number) => String(value).padStart(2, "0");
export function normalizeFocusMinutes(minutes: number): number {
  return Math.min(maxTime / 1000, Math.max(1, Math.round((Number.isFinite(minutes) ? minutes : 25) * 60))) / 60;
}
export function normalizeTimerSettings(value: Partial<TimerSettings>): TimerSettings {
  const validMinutes = (minutes: number | undefined, fallback: number) =>
    Number.isFinite(minutes) ? normalizeFocusMinutes(minutes!) : fallback;
  return {
    focusMinutes: validMinutes(value.focusMinutes, 25),
    shortMinutes: validMinutes(value.shortMinutes, 5),
    longMinutes: validMinutes(value.longMinutes, 15),
    longEvery: Number.isFinite(value.longEvery) ? Math.max(1, Math.min(12, Math.round(value.longEvery!))) : 4,
    autoStart: value.autoStart === true,
    sound: value.sound !== false,
    volume: Number.isFinite(value.volume) ? Math.max(0, Math.min(1, value.volume!)) : .55,
    desktopNotifications: value.desktopNotifications === true,
  };
}
export function stageLength(timer: Timer, settings: TimerSettings) {
  return Math.round(minute * (timer.phase !== "break" ? settings.focusMinutes
    : timer.breakKind === "long" ? settings.longMinutes : settings.shortMinutes));
}
export function resetStage(timer: Timer, settings: TimerSettings): Timer {
  const remaining = stageLength(timer, settings);
  return {
    ...timer, phase: timer.phase === "break" ? "break" : "idle",
    running: false, remaining, duration: remaining, deadline: null, started: false, custom: false,
  };
}
export function startTimer(timer: Timer, minutes: number, now: number, phase: Phase = "focus"): Timer {
  const duration = Math.round(normalizeFocusMinutes(minutes) * minute);
  return {
    ...timer, phase, running: true, started: true, remaining: duration,
    duration, deadline: now + duration,
  };
}
export function resume(timer: Timer, now: number): Timer {
  return {
    ...timer, phase: timer.phase === "idle" ? "focus" : timer.phase,
    running: true, started: true, duration: timer.duration ?? timer.remaining,
    deadline: now + timer.remaining,
  };
}
export function editStage(timer: Timer, milliseconds: number): Timer {
  if (timer.running || !Number.isFinite(milliseconds)) return timer;
  const remaining = Math.max(1000, Math.min(maxTime, Math.round(milliseconds / 1000) * 1000));
  if (remaining === Math.ceil(timer.remaining / 1000) * 1000) return timer;
  const elapsed = timer.started ? Math.max(0, (timer.duration ?? timer.remaining) - timer.remaining) : 0;
  return { ...timer, remaining, duration: elapsed + remaining, custom: true };
}
export function nextStage(timer: Timer, settings: TimerSettings, completed: boolean): Timer {
  const wasFocus = timer.phase !== "break";
  const round = wasFocus ? (timer.round ?? 0) + Number(completed)
    : timer.breakKind === "long" ? 0 : (timer.round ?? 0);
  return resetStage({
    ...timer,
    phase: wasFocus ? "break" : "idle",
    breakKind: wasFocus && round >= settings.longEvery ? "long" : "short",
    round,
    completed: timer.completed + Number(wasFocus && completed),
  }, settings);
}
export function tick(timer: Timer, now: number, settings = defaultTimerSettings): Timer {
  if (!timer.running || timer.deadline === null) return timer;
  const remaining = timer.deadline - now;
  if (remaining > 0) return { ...timer, remaining };
  const next = nextStage(timer, settings, true);
  if (!settings.autoStart) return next;
  // Credit only the elapsed active stage after absence. If the next stage
  // would also be overdue, give it a fresh start rather than inventing rounds.
  const start = timer.deadline + next.remaining > now ? timer.deadline : now;
  return { ...resume(next, start), remaining: start + next.remaining - now };
}
export function pause(timer: Timer, now: number): Timer {
  const current = tick(timer, now);
  return { ...current, running: false, deadline: null };
}
export function localDay(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${formatTimerPart(date.getMonth() + 1)}-${formatTimerPart(date.getDate())}`;
}
export function addFocusRecord(records: FocusRecord[], timer: Timer, settings: TimerSettings): FocusRecord[] {
  if (timer.phase !== "focus" || timer.deadline === null) return records;
  const id = `${timer.deadline}:${timer.completed + 1}`;
  if (records.some(record => record.id === id)) return records;
  return [...records, {
    id, day: localDay(timer.deadline), milliseconds: timer.duration ?? stageLength(timer, settings),
  }];
}
export function dailyFocus(records: FocusRecord[]) {
  const days = new Map<string, { count: number; minutes: number }>();
  for (const record of records) {
    const day = days.get(record.day) ?? { count: 0, minutes: 0 };
    days.set(record.day, { count: day.count + 1, minutes: day.minutes + record.milliseconds / minute });
  }
  return days;
}
export function chooseAction(phase: Phase, random: number): Action {
  if (phase === "focus") return "read";
  if (phase === "break") return random < 0.5 ? "rest" : "stretch";
  const pool: Action[] = ["idle", "walk", "rest", "walk", "stretch"];
  return pool[
    Math.min(pool.length - 1, Math.max(0, Math.floor(random * pool.length)))
  ];
}
export function allowedAction(action: unknown, phase: Phase): Action {
  const actions: Action[] = [
    "idle",
    "walk",
    "read",
    "rest",
    "happy",
    "listen",
    "stretch",
    "approach",
    "return",
  ];
  if (!actions.includes(action as Action))
    return phase === "focus" ? "read" : "idle";
  if (phase === "focus" && action !== "listen" && action !== "read")
    return "listen";
  return action as Action;
}
export function restoreTimer(value: unknown, now: number, settings = defaultTimerSettings, settle = true): Timer {
  if (!value || typeof value !== "object") return { ...initialTimer };
  const t = value as Timer;
  if (
    !["idle", "focus", "break"].includes(t.phase) ||
    typeof t.running !== "boolean" ||
    !Number.isFinite(t.remaining) ||
    t.remaining < 0 ||
    t.remaining > maxTime ||
    !Number.isInteger(t.completed) ||
    t.completed < 0 ||
    t.completed > 1_000_000 ||
    (t.running &&
      (!Number.isFinite(t.deadline) ||
        (t.deadline as number) < 0 ||
        (t.deadline as number) - now > maxTime))
  )
    return { ...initialTimer };
  const remaining = t.remaining > 0 ? t.remaining : stageLength(t, settings);
  const normalized: Timer = {
    ...t, remaining,
    started: t.started ?? (t.running || t.phase === "focus" || (t.phase === "break" && remaining !== settings.shortMinutes * minute)),
    breakKind: t.breakKind === "long" ? "long" : "short",
    round: Number.isInteger(t.round) && t.round! >= 0 ? Math.min(12, t.round!) : t.completed % settings.longEvery,
    duration: Number.isFinite(t.duration) && t.duration! >= remaining ? t.duration : undefined,
    deadline: t.running ? t.deadline : null,
  };
  return settle ? tick(normalized, now, settings) : normalized;
}
