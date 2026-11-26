import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
/** Preserve the same geometry on slow devices; reduce fill rate after warm-up. */
export function RenderQuality({ sharpSearch = false }: { sharpSearch?: boolean }) {
  const { gl, setDpr, size } = useThree();
  const sample = useRef({ start: 0, frames: 0 });
  useLayoutEffect(() => {
    if (!sharpSearch) return;
    const previous = gl.getPixelRatio();
    const target = Math.min(2, Math.max(1.5, window.devicePixelRatio),
      Math.sqrt(6_000_000 / Math.max(1, size.width * size.height)));
    if (target <= previous) return;
    setDpr(target);
    return () => {
      setDpr(previous);
      sample.current = { start: 0, frames: 0 };
    };
  }, [gl, setDpr, sharpSearch, size.width, size.height]);
  useFrame((state) => {
    if (sharpSearch) {
      gl.domElement.dataset.qualityDpr = gl.getPixelRatio().toFixed(2);
      return;
    }
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
