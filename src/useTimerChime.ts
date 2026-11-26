import { useCallback, useEffect, useRef } from "react";

const notes = {
  start: [523.25, 659.25],
  focus: [784, 1174.66],
  break: [659.25, 523.25],
};

export function useTimerChime() {
  const context = useRef<AudioContext | null>(null);

  useEffect(() => () => {
    const audio = context.current;
    context.current = null;
    if (audio && audio.state !== "closed") void audio.close().catch(() => {});
  }, []);

  const arm = useCallback(async () => {
    try {
      const audio = context.current ??= new AudioContext();
      if (audio.state !== "running") await audio.resume();
    } catch {
      // The visible reminder still works without Web Audio.
    }
  }, []);

  const ring = useCallback((cue: keyof typeof notes, volume: number) => {
    const audio = context.current;
    if (!audio || audio.state !== "running" || volume <= 0) return;
    const start = audio.currentTime;
    notes[cue].forEach((frequency, index) => {
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      const at = start + index * (cue === "focus" ? .035 : .145);
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume * (index === 0 ? .17 : .09), at + .017);
      gain.gain.exponentialRampToValueAtTime(.0001, at + .62);
      tone.connect(gain).connect(audio.destination);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); };
      tone.start(at);
      tone.stop(at + .65);
    });
  }, []);
  return { arm, ring };
}
