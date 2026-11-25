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
export const idlePause = (random = Math.random) => 1.5 + random() * 2.5;
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
                ? safeDrop(-1.1, .65)
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
  if (phase === "idle") {
    const [x, z] = current.target;
    const startAngle = random() * Math.PI * 2;
    const radius = 0.9 + random() * 1.3;
    for (let attempt = 0; attempt < 6; attempt++) {
      const angle = startAngle + attempt * Math.PI / 3;
      const target = safeDrop(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius);
      const distance = Math.hypot(target[0] - x, target[1] - z);
      if (distance >= 0.55 && distance <= 2.8)
        return { ...current, action: "walk", target, until: Infinity };
    }
    return { ...current, action: "idle", until: elapsed + idlePause(random) };
  }
  const action = chooseAction(phase, random());
  let target = current.target;
  if (phase === "focus") target = desk;
  else if (action === "rest") target = safeDrop(-1.1, .65);
  return { ...current, action, target, until: elapsed + 5 + random() * 7 };
}
