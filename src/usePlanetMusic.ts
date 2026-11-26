import { useEffect, useRef, useState } from "react";
import type { PlanetId } from "./planets";
import home from "../assets/music/home.mp3";
import moon from "../assets/music/moon.mp3";
import rose from "../assets/music/rose.mp3";
import forest from "../assets/music/forest.mp3";

export const planetMusic: Record<PlanetId, string> = { b612: home, moon, rose, forest };
const preference = "companion-planet-music";

function defaultEnabled() {
  try { return localStorage.getItem(preference) !== "off"; }
  catch { return true; }
}

export function usePlanetMusic(planet: PlanetId) {
  const player = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(defaultEnabled);
  const enabled = useRef(on);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = "none";
    audio.volume = .35;
    player.current = audio;
    const unlock = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-planet-audio]")) return;
      if (enabled.current && audio.paused) void audio.play().catch(() => {});
    };
    document.addEventListener("pointerup", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return () => {
      document.removeEventListener("pointerup", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      player.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = player.current;
    if (!audio) return;
    audio.pause();
    audio.src = planetMusic[planet];
    audio.load();
    // Autoplay can be blocked until the first interaction; preserve the preference.
    if (enabled.current) void audio.play().catch(() => {});
  }, [planet]);

  const toggle = async () => {
    const audio = player.current;
    if (!audio) return;
    enabled.current = !enabled.current;
    setOn(enabled.current);
    try { localStorage.setItem(preference, enabled.current ? "on" : "off"); } catch { /* Session only. */ }
    if (enabled.current) await audio.play().catch(() => {});
    else audio.pause();
  };
  return { on, toggle };
}
