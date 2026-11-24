import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
/** Multi-touch/rotation must never leak a synthetic click to furniture. */
export function CanvasGestures() {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement,
      pointers = new Map<number, { x: number; y: number }>();
    let blocked = false;
    const down = (e: PointerEvent) => {
      if (pointers.size === 0) {
        blocked = false;
        canvas.dataset.multiTouch = "false";
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size > 1) {
        blocked = true;
        canvas.dataset.multiTouch = "true";
        window.dispatchEvent(new Event("companion-multi-touch"));
      }
    };
    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) blocked = true;
    };
    const up = (e: PointerEvent) => {
      if (e.type === "pointercancel") blocked = true;
      pointers.delete(e.pointerId);
    };
    const click = (e: MouseEvent) => {
      if (blocked) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const blur = () => {
      pointers.clear();
      blocked = true;
    };
    canvas.addEventListener("pointerdown", down, true);
    canvas.addEventListener("pointermove", move, true);
    canvas.addEventListener("pointerup", up, true);
    canvas.addEventListener("pointercancel", up, true);
    canvas.addEventListener("click", click, true);
    window.addEventListener("blur", blur);
    return () => {
      canvas.removeEventListener("pointerdown", down, true);
      canvas.removeEventListener("pointermove", move, true);
      canvas.removeEventListener("pointerup", up, true);
      canvas.removeEventListener("pointercancel", up, true);
      canvas.removeEventListener("click", click, true);
      window.removeEventListener("blur", blur);
    };
  }, [gl]);
  return null;
}
