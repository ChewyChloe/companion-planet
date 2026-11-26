import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils } from "three";
import SculptCharacter from "../art/SculptCharacter";
import { turnToward } from "../art/locomotion";
import type { Action } from "../domain";
import { useWorld } from "../store";
import { clockPath } from "./clock-path";

export function ClockResident({ celebration }: { celebration: number }) {
  const resident = useRef<Group>(null);
  const time = useRef(0);
  const gait = useRef(0);
  const angle = useRef(1.15);
  const seat = useRef(0);
  const cheer = useRef({ event: celebration, remaining: 0 });
  const [pose, setPose] = useState<Action>("idle");
  const poseRef = useRef<Action>("idle");

  useFrame(({ gl }, delta) => {
    if (!resident.current) return;
    const dt = Math.min(delta, .065);
    const { timer, reduced, silent } = useWorld.getState();
    time.current += dt;
    const focus = timer.running && timer.phase === "focus";
    const resting = timer.phase === "break";
    const cycle = time.current % (focus ? 27 : 20);
    let target: Action = cycle < (focus ? 6 : 9) ? "walk" : cycle < 11 ? "idle" : "read";
    if (resting && cycle >= 14) target = "rest";
    if (!focus && !silent && !reduced && cycle > 10 && cycle < 11.5) target = "stretch";
    if (cheer.current.event !== celebration) {
      cheer.current = { event: celebration, remaining: 1.6 };
    }
    if (cheer.current.remaining > 0) {
      if (!reduced) target = "happy";
      cheer.current.remaining -= dt;
    }
    if (target !== poseRef.current) {
      poseRef.current = target;
      setPose(target);
    }
    const before = clockPath(angle.current);
    if (target === "walk") angle.current += dt * (focus || reduced ? .55 : resting ? .82 : .93);
    const point = clockPath(angle.current);
    const travelled = Math.hypot(point.x - before.x, point.z - before.z);
    gait.current += travelled / .115 * (Math.PI * 2 / 7.1);
    seat.current = MathUtils.damp(seat.current, target === "read" ? 1 : 0, 8, dt);
    const support = point.y + .004;
    resident.current.position.set(point.x, support, point.z);
    const heading = target === "walk" ? Math.atan2(point.tangentX, point.tangentZ) : 0;
    resident.current.rotation.y = turnToward(resident.current.rotation.y, heading, dt);
    gl.domElement.dataset.clockPose = target;
    gl.domElement.dataset.clockPosition = [point.x, support, point.z].map(value => value.toFixed(3)).join(",");
  });

  return (
    <group ref={resident} scale={.207} name="ClockResident" position={[.088, .8, .106]}>
      <SculptCharacter action={pose} time={time} gaitTime={gait} seatBlend={seat} floatingStage />
    </group>
  );
}
