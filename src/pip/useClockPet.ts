import { useCallback, useEffect, useRef, useState } from "react";
import css from "./clock-pet.css?inline";

type PipApi = { requestWindow: (options: { width: number; height: number }) => Promise<Window> };

export function useClockPet() {
  const [host, setHost] = useState<Window | null>(null);
  const [fallback, setFallback] = useState("");
  const active = useRef<Window | null>(null);
  const opening = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    const popup = active.current;
    active.current = null;
    setHost(null);
    setFallback("");
    if (popup && !popup.closed) popup.close();
    window.focus();
    trigger.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const cleanup = () => active.current?.close();
    window.addEventListener("pagehide", cleanup);
    return () => {
      window.removeEventListener("pagehide", cleanup);
      cleanup();
    };
  }, []);

  async function open() {
    if (opening.current) return;
    if (active.current && !active.current.closed) {
      active.current.focus();
      return;
    }
    const api = (window as Window & { documentPictureInPicture?: PipApi }).documentPictureInPicture;
    if (!api || !window.isSecureContext) {
      setFallback("此瀏覽器不支援跨視窗浮動，已在同頻星球內開啟桌寵");
      return;
    }
    opening.current = true;
    let popup: Window | undefined;
    try {
      popup = await api.requestWindow({ width: 355, height: 385 });
      const doc = popup.document;
      doc.documentElement.lang = "zh-Hant";
      doc.documentElement.className = "clock-pet-document";
      doc.title = "星球鐘";
      const style = doc.createElement("style");
      style.textContent = css;
      doc.head.append(style);
      const current = popup;
      popup.addEventListener("pagehide", () => {
        if (active.current === current) close();
      }, { once: true });
      popup.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
      active.current = popup;
      setFallback("");
      setHost(popup);
    } catch {
      popup?.close();
      setFallback("瀏覽器無法開啟獨立浮窗，已在同頻星球內開啟桌寵");
    } finally {
      opening.current = false;
    }
  }
  return { host, fallback, trigger, open, close };
}
