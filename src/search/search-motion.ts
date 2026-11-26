import { MathUtils } from "three";

export function searchMotion(progress: number) {
  return {
    travel: MathUtils.smootherstep(progress, 0, .42),
    shell: MathUtils.smootherstep(progress, .28, .59),
    bar: MathUtils.smootherstep(progress, .59, 1),
    veil: MathUtils.smootherstep(progress, 0, .52),
  };
}
