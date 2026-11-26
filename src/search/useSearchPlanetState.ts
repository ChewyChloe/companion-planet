import { useState } from "react";

export function useSearchPlanetState() {
  const [phase, setPhase] = useState<"closed" | "opening" | "open" | "closing">("closed");
  return {
    phase,
    open: () => setPhase((current) => current === "closed" ? "opening" : current),
    opened: () => setPhase((current) => current === "opening" ? "open" : current),
    close: () => setPhase((current) => current === "closed" ? current : "closing"),
    closed: () => setPhase((current) => current === "closing" ? "closed" : current),
  };
}

export type SearchPlanetState = ReturnType<typeof useSearchPlanetState>;
