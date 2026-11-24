import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
/** Preserve the same geometry on slow devices; reduce fill rate after warm-up. */
export function RenderQuality() {
  const { gl, setDpr } = useThree();
  const sample = useRef({ start: 0, frames: 0 });
  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now < 3) return;
    if (!sample.current.start) sample.current.start = now;
    sample.current.frames++;
    const elapsed = now - sample.current.start;
    if (elapsed < 2) return;
    const fps = sample.current.frames / elapsed,
      current = gl.getPixelRatio();
    if (fps < 24 && current > 0.7)
      setDpr(Math.max(0.7, Math.min(1, current * 0.8)));
    gl.domElement.dataset.qualityDpr = gl.getPixelRatio().toFixed(2);
    gl.domElement.dataset.sampleFps = fps.toFixed(1);
    sample.current = { start: now, frames: 0 };
  });
  return null;
}
