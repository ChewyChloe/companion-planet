import { useEffect, useRef, useState } from "react";
import { searchPlanets, type SearchResult } from "./search-data";

export function useSearchPlanetState() {
  const [phase, setPhase] = useState<"closed" | "opening" | "open" | "searching" | "results" | "closing">("closed");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [failed, setFailed] = useState(false);
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);

  function close() {
    request.current++;
    setPhase((current) => current === "closed" ? current : "closing");
  }

  async function submit() {
    if (!query.trim() || (phase !== "open" && phase !== "results")) return;
    const id = ++request.current;
    setPhase("searching");
    setFailed(false);
    try {
      const matches = await searchPlanets(query);
      if (id !== request.current) return;
      setResults(matches);
    } catch {
      if (id !== request.current) return;
      setResults([]);
      setFailed(true);
    }
    setPhase("results");
  }

  return {
    phase, query, setQuery, results, failed, close, submit,
    open: () => setPhase((current) => current === "closed" ? "opening" : current),
    opened: () => setPhase((current) => current === "opening" ? "open" : current),
    closed: () => {
      setPhase((current) => current === "closing" ? "closed" : current);
      setQuery("");
      setResults([]);
      setFailed(false);
    },
  };
}

export type SearchPlanetState = ReturnType<typeof useSearchPlanetState>;
