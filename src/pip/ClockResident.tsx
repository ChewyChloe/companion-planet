import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Matrix4, MathUtils, Quaternion, Vector3 } from "three";
import SculptCharacter from "../art/SculptCharacter";
import type { Action } from "../domain";
import { useWorld } from "../store";
import { clockPath, clockRingLift, fullClockLap } from "./clock-path";

const startAngle = -.16;
const stops = [.67, 1.37, 2.49, 3.4, 4.15, 5.35, 6.12];
const messages = [
  "走累了就一起歇一下吧",
  "我在這裡陪你～",
  "剛才從下面看，星星亮了一點",
  "我看見你啦！",
];

export function ClockResident({ celebration, bubble, onSay }: {
  celebration: number;
  bubble: RefObject<HTMLDivElement | null>;
  onSay: (line: string) => void;
}) {
  const resident = useRef<Group>(null);
  const time = useRef(0);
  const gait = useRef(0);
  const orbit = useRef({ angle: startAngle, nextStop: stops[0], pause: 0, stop: 0 });
  const seat = useRef(0);
  const cheer = useRef({ event: celebration, remaining: 0 });
  const [pose, setPose] = useState<Action>("idle");
  const poseRef = useRef<Action>("idle");
  const activeLine = useRef("");
  const scratch = useMemo(() => ({
    up: new Vector3(), forward: new Vector3(), right: new Vector3(), marker: new Vector3(),
    basis: new Matrix4(), facing: new Quaternion(),
  }), []);

  useFrame(({ camera, gl }, delta) => {
    const actor = resident.current;
    if (!actor) return;
    const dt = Math.min(delta, .08);
    const { timer, reduced, silent } = useWorld.getState();
    time.current += dt;
    const focus = timer.running && timer.phase === "focus";
    const resting = timer.phase === "break";
    const loop = orbit.current;
    if (cheer.current.event !== celebration) cheer.current = { event: celebration, remaining: 1.6 };

    const before = clockPath(loop.angle);
    const talkStop = !silent && !focus && loop.stop % 3 === 0 && before.upY > -.4;
    const stride = focus || reduced ? .32 : .47;
    let target: Action = "walk";
    if (cheer.current.remaining > 0) {
      cheer.current.remaining -= dt;
      target = reduced ? "idle" : "happy";
    } else if (loop.angle >= loop.nextStop) {
      loop.pause += dt;
      const pauseLength = focus ? 4.4 : talkStop ? 3.8 : 1.7 + loop.stop % 3 * .55;
      target = loop.pause < (talkStop ? 3.1 : 1.3) ? "idle" : resting ? "rest" : "read";
      if (loop.pause >= pauseLength) {
        loop.stop++;
        loop.nextStop = Math.floor(loop.stop / stops.length) * fullClockLap + stops[loop.stop % stops.length];
        loop.pause = 0;
        target = "walk";
      }
    }
    if (target === "walk") {
      const remaining = loop.nextStop - loop.angle;
      const approach = MathUtils.smoothstep(remaining, 0, .22);
      loop.angle = Math.min(loop.nextStop, loop.angle + dt * stride * (.42 + .58 * approach));
    }
    if (target !== poseRef.current) {
      poseRef.current = target;
      setPose(target);
    }
    const point = clockPath(loop.angle);
    const travelled = Math.hypot(point.x - before.x, point.y - before.y, point.z - before.z);
    gait.current += travelled / .115 * (fullClockLap / 7.1);
    seat.current = MathUtils.damp(seat.current, target === "read" ? 1 : 0, 8, dt);

    const { up, forward, right, marker, basis, facing } = scratch;
    up.set(point.upX, point.upY, .24).normalize();
    const lift = clockRingLift(loop.angle) + .006;
    actor.position.set(point.x + point.upX * lift, point.y + point.upY * lift, point.z + .006);
    if (target === "walk") {
      const next = clockPath(loop.angle + .02);
      forward.set(next.x - point.x, next.y - point.y, next.z - point.z);
    } else {
      camera.getWorldDirection(forward).negate();
    }
    right.crossVectors(up, forward).normalize();
    forward.crossVectors(right, up).normalize();
    facing.setFromRotationMatrix(basis.makeBasis(right, up, forward));
    actor.quaternion.slerp(facing, 1 - Math.exp(-dt * 13));

    const line = talkStop && target === "idle" && loop.pause > .45
      ? messages[Math.floor(loop.stop / 3) % messages.length] : "";
    if (line !== activeLine.current) {
      activeLine.current = line;
      onSay(line);
    }
    if (line && bubble.current) {
      marker.copy(actor.position).addScaledVector(up, .13).project(camera);
      const x = (marker.x + 1) * 50;
      const side = x > 50 ? "left" : "right";
      bubble.current.dataset.side = side;
      bubble.current.style.left = `${MathUtils.clamp(x + (side === "left" ? -12 : 12), 39, 61)}%`;
      bubble.current.style.top = `${MathUtils.clamp((1 - marker.y) * 50, 12, 78)}%`;
    }
    gl.domElement.dataset.clockPose = target;
    gl.domElement.dataset.clockSpeaking = String(Boolean(line));
    gl.domElement.dataset.clockPosition = actor.position.toArray().map(value => value.toFixed(3)).join(",");
  });

  const start = clockPath(startAngle);
  return (
    <group ref={resident} scale={.17} name="ClockResident" position={[start.x, start.y, start.z]}>
      <SculptCharacter action={pose} time={time} gaitTime={gait} seatBlend={seat} floatingStage />
    </group>
  );
}
