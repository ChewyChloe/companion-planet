import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld } from "../store";
export function JourneyCamera() {
  const { camera, controls, size, gl } = useThree();
  const active = useRef(0),
    start = useRef(new THREE.Vector3()),
    far = useRef(new THREE.Vector3());
  useFrame(() => {
    const state = useWorld.getState(),
      journey = state.journey;
    if (!journey) return;
    const orbit = controls as unknown as { enabled: boolean } | null;
    if (orbit) orbit.enabled = false;
    if (active.current !== journey.started) {
      active.current = journey.started;
      start.current.copy(camera.position);
      far.current.copy(camera.position).multiplyScalar(1.5);
      far.current.y += 1;
    }
    const p = state.reduced
        ? 1
        : Math.min(1, (Date.now() - journey.started) / 1700),
      ease = (t: number) => t * t * (3 - 2 * t);
    const scale = Math.max(1, 0.6 / (size.width / size.height)),
      home = new THREE.Vector3(6 * scale, 4.2 * scale, 10 * scale);
    if (!state.reduced) {
      if (p < 0.5)
        camera.position.copy(start.current).lerp(far.current, ease(p * 2));
      else
        camera.position
          .copy(
            home
              .clone()
              .multiplyScalar(1.5)
              .add(new THREE.Vector3(0, 1, 0)),
          )
          .lerp(home, ease((p - 0.5) * 2));
      camera.lookAt(0, -0.6, 0);
      camera.updateMatrixWorld();
    }
    const host = gl.domElement.closest(".world") as HTMLElement | null;
    host?.style.setProperty(
      "--journey-opacity",
      String(Math.sin(p * Math.PI) * 0.88),
    );
    gl.domElement.dataset.journey = p < 0.5 ? "departing" : "arriving";
    if (p >= 0.5 && state.planetId !== journey.target)
      useWorld.setState({
        ...(state.worldStates[journey.target] || {
          lampOn: true,
          flowersBloom: false,
        }),
        planetId: journey.target,
        destination: null,
        reaction: null,
        reactionUntil: 0,
      });
    if (p === 1) {
      useWorld.setState({ journey: null });
      gl.domElement.dataset.journey = "idle";
      host?.style.setProperty("--journey-opacity", "0");
      if (orbit) orbit.enabled = true;
    }
  }, -0.5);
  return null;
}
