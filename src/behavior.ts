import { allowedAction, chooseAction, type Action, type Phase } from "./domain";
export interface Behavior {
  action: Action;
  target: [number, number];
  home: [number, number];
  until: number;
  phase: Phase;
  reactionId: number;
}
export const initialBehavior: Behavior = {
  action: "idle",
  target: [-0.4, 0.5],
  home: [-0.4, 0.5],
  until: 0,
  phase: "idle",
  reactionId: 0,
};
const desk: [number, number] = [0.72, 0.23];
/** High-level planner; render frames only interpolate its bounded destinations. */
export function advanceBehavior(
  current: Behavior,
  phase: Phase,
  reaction: Action | null,
  reactionUntil: number,
  now: number,
  elapsed: number,
  random: () => number = Math.random,
): Behavior {
  if (current.phase !== phase) {
    if (phase === "focus")
      return {
        ...current,
        phase,
        action: "read",
        target: desk,
        until: elapsed + 6,
        reactionId: reactionUntil,
      };
    return {
      ...current,
      phase,
      action: phase === "break" ? "stretch" : "idle",
      until: elapsed + (phase === "break" ? 3 : 0),
      reactionId: reactionUntil,
    };
  }
  if (reaction && now < reactionUntil && current.reactionId !== reactionUntil) {
    const action = allowedAction(reaction, phase);
    return {
      ...current,
      action,
      reactionId: reactionUntil,
      home: current.target,
      target:
        phase === "focus"
          ? desk
          : action === "approach"
            ? [0, 1.1]
            : action === "return"
              ? current.home
              : current.target,
      until: elapsed + 3.2,
    };
  }
  if (reaction && now < reactionUntil) return current;
  if (current.action === "approach")
    return {
      ...current,
      action: "return",
      target: current.home,
      until: elapsed + 6,
    };
  if (elapsed < current.until) return current;
  const action = chooseAction(phase, random());
  let target = current.target;
  if (phase === "focus") target = desk;
  else if (action === "rest") target = [-1.1, 0.65];
  else if (action === "walk") {
    const angle = 0.15 + random() * (Math.PI - 0.3);
    const radius = 0.55 + random() * 0.5;
    target = [Math.cos(angle) * radius, 0.3 + Math.sin(angle) * radius * 0.7];
  }
  return { ...current, action, target, until: elapsed + 5 + random() * 7 };
}
