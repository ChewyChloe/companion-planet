import { safeDrop } from "./art/placement";
import { HOME, APPROACH, CHAIR } from "./art/terrain";
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
  target: [...HOME],
  home: [...HOME],
  until: 0,
  phase: "idle",
  reactionId: 0,
};
const desk: [number, number] = [CHAIR.x, CHAIR.z];
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
            ? [...APPROACH]
            : action === "return"
              ? current.home
              : action === "rest"
                ? [-1.1, 0.65]
                : action === "read"
                  ? desk
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
    const angle = random() * Math.PI * 2;
    const radius = 1.3 + random() * 2.5;
    target = safeDrop(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  return { ...current, action, target, until: elapsed + 5 + random() * 7 };
}
