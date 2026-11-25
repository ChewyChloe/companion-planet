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
export interface Timer {
  phase: Phase;
  running: boolean;
  remaining: number;
  deadline: number | null;
  completed: number;
}
export const initialTimer: Timer = {
  phase: "idle",
  running: false,
  remaining: 25 * 60_000,
  deadline: null,
  completed: 0,
};
export const formatTimerPart = (value: number) => String(value).padStart(2, "0");
export function normalizeFocusMinutes(minutes: number): number {
  return Math.min(5400, Math.max(1, Math.round((Number.isFinite(minutes) ? minutes : 25) * 60))) / 60;
}
export function startTimer(
  timer: Timer,
  minutes: number,
  now: number,
  phase: Phase = "focus",
): Timer {
  const duration = Math.round(normalizeFocusMinutes(minutes) * 60_000);
  return {
    ...timer,
    phase,
    running: true,
    remaining: duration,
    deadline: now + duration,
  };
}
export function tick(timer: Timer, now: number): Timer {
  if (!timer.running || timer.deadline === null) return timer;
  const remaining = Math.max(0, timer.deadline - now);
  if (remaining > 0) return { ...timer, remaining };
  return {
    ...timer,
    phase: timer.phase === "focus" ? "break" : "idle",
    running: false,
    deadline: null,
    remaining: timer.phase === "focus" ? 5 * 60_000 : 25 * 60_000,
    completed: timer.completed + (timer.phase === "focus" ? 1 : 0),
  };
}
export function pause(timer: Timer, now: number): Timer {
  const current = tick(timer, now);
  return { ...current, running: false, deadline: null };
}
export function resume(timer: Timer, now: number): Timer {
  return { ...timer, running: true, deadline: now + timer.remaining };
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
export function shouldNotify(
  previous: Timer,
  next: Timer,
  silent: boolean,
  notifications: boolean,
) {
  return !silent && notifications && next.completed > previous.completed;
}
export function restoreTimer(value: unknown, now: number): Timer {
  if (!value || typeof value !== "object") return { ...initialTimer };
  const t = value as Timer;
  if (
    !["idle", "focus", "break"].includes(t.phase) ||
    typeof t.running !== "boolean" ||
    !Number.isFinite(t.remaining) ||
    t.remaining < 0 ||
    t.remaining > 90 * 60_000 ||
    !Number.isInteger(t.completed) ||
    t.completed < 0 ||
    t.completed > 1_000_000 ||
    (t.running &&
      (!Number.isFinite(t.deadline) ||
        (t.deadline as number) < 0 ||
        (t.deadline as number) - now > 90 * 60_000))
  )
    return { ...initialTimer };
  return tick({ ...t }, now);
}
