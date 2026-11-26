import type { CSSProperties } from "react";
type Name =
  | "orbit"
  | "moon"
  | "sound"
  | "mute"
  | "bell"
  | "bell-off"
  | "settings"
  | "sliders"
  | "arrow"
  | "pause"
  | "play"
  | "reset"
  | "close"
  | "minimize"
  | "chat"
  | "expand"
  | "move"
  | "hand"
  | "leaf"
  | "check";
const paths: Record<Name, string[]> = {
  orbit: [
    "M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0",
    "M3 16c2 3 8 1 13-3s7-8 4-9-8 0-12 4-7 6-5 8",
  ],
  moon: ["M19.5 14A8 8 0 0 1 10 4.5 8 8 0 1 0 19.5 14Z"],
  sound: [
    "M4 10h4l5-4v12l-5-4H4Z",
    "M17 9a5 5 0 0 1 0 6",
    "M20 6a9 9 0 0 1 0 12",
  ],
  mute: ["M4 10h4l5-4v12l-5-4H4Z", "m17 9 5 6m0-6-5 6"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 5-2 6-2 8h16c0-2-2-3-2-8", "M10 20a2 2 0 0 0 4 0"],
  "bell-off": ["M9 4a6 6 0 0 1 9 5v.5c0 2 .4 3.4 1 4.5M6.5 6.5A6 6 0 0 0 6 9c0 4-2 5-2 7h12", "M10 20a2 2 0 0 0 4 0M3 3l18 18"],
  sliders: ["M4 7h5m4 0h7M4 17h9m4 0h3","M9 4v6m8 4v6"],
  settings: [
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    "M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  ],
  arrow: ["M4 12h16m-6-6 6 6-6 6"],
  pause: ["M8 5v14M16 5v14"],
  play: ["m8 5 11 7-11 7Z"],
  reset: ["M4 10a8 8 0 1 1 1 7", "M4 4v6h6"],
  close: ["m6 6 12 12M18 6 6 18"],
  minimize: ["M5 12h14"],
  chat: ["M4 5h16v12H9l-5 4Z", "M8 9h8M8 13h5"],
  expand: ["M14 4h6v6m0-6L9 15", "M10 4H4v16h16v-6"],
  move: [
    "M12 3v18M3 12h18",
    "m8 7 4-4 4 4m-8 10 4 4 4-4M7 8l-4 4 4 4m10-8 4 4-4 4",
  ],
  hand: [
    "M8 12V5a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2",
  ],
  leaf: ["M20 4C8 3 3 7 5 14s14 7 15-10Z", "M7 17 16 8"],
  check: ["m5 12 4 4L19 6"],
};
export function Icon({
  name,
  className = "",
  style,
}: {
  name: Name;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={`icon ${className}`}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
