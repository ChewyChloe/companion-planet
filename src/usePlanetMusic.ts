import { useEffect, useRef, useState } from "react";
import type { PlanetId } from "./planets";
import home from "../assets/music/home.mp3";
import moon from "../assets/music/moon.mp3";
import rose from "../assets/music/rose.mp3";
import forest from "../assets/music/forest.mp3";

export const planetMusic: Record<PlanetId, string> = { b612: home, moon, rose, forest };

export function usePlanetMusic(planet: PlanetId) {
  const player = useRef<HTMLAudioElement | null>(null);
  const enabled = useRef(false);
  const generation = useRef(0);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = "none";
    audio.volume = 0.35;
    player.current = audio;
    return () => {
      generation.current++;
      enabled.current = false;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      player.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = player.current!;
    const token = ++generation.current;
    audio.pause();
    audio.src = planetMusic[planet];
    audio.load();
    if (enabled.current) {
      void audio.play().catch(() => {
        if (token !== generation.current) return;
        enabled.current = false;
        setOn(false);
      });
    }
  }, [planet]);

  const toggle = async () => {
    const audio = player.current;
    if (!audio) return;
    const token = ++generation.current;
    enabled.current = !enabled.current;
    setOn(enabled.current);
    if (!enabled.current) {
      audio.pause();
      return;
    }
    // Start directly inside the user's gesture, including on mobile Safari.
    try {
      await audio.play();
    } catch {
      if (token !== generation.current) return;
      enabled.current = false;
      setOn(false);
    }
  };
  return { on, toggle };
}
