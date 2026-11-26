import { useEffect, useRef, type RefObject } from "react";
import { SearchResultsPanel } from "./SearchResultsPanel";
import type { SearchPlanetState } from "./useSearchPlanetState";
import "./search.css";

export function SearchOverlay({ state, trigger }: {
  state: SearchPlanetState;
  trigger: RefObject<HTMLButtonElement | null>;
}) {
  const { phase, close, submit, query, setQuery, results, failed } = state;
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const involved = useRef(false);
  const controlsVisible = phase === "open" || phase === "searching" || phase === "results";
  useEffect(() => {
    if (phase === "opening") {
      involved.current = true;
      dialog.current?.focus();
    }
    if (phase === "open") {
      // Preserve the model alignment until a touch user explicitly opens the keyboard.
      if (window.matchMedia("(pointer: coarse)").matches) dialog.current?.focus();
      else input.current?.focus({ preventScroll: true });
    }
    if (phase === "closed" && involved.current) {
      involved.current = false;
      trigger.current?.focus({ preventScroll: true });
    }
  }, [phase, trigger]);

  if (phase === "closed") return null;
  return (
    <div
      className="search-planet-overlay"
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label="搜尋星球"
      ref={dialog}
      tabIndex={-1}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.stopPropagation();
          close();
        }
        if (event.key !== "Tab") return;
        const items = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), a, [tabindex='0']")];
        const first = items[0];
        const last = items.at(-1);
        if (!controlsVisible || !first || !last) {
          event.preventDefault();
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="search-planet-controls" inert={!controlsVisible}>
        <button className="search-planet-close" type="button" aria-label="關閉搜尋星球" onClick={close}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <form className="search-planet-form" onSubmit={(event) => {
          event.preventDefault();
          if (!composing.current) void submit();
        }}>
          <input ref={input} type="search" aria-label="搜尋關鍵字" placeholder="找找星球上的小事" value={query} maxLength={120}
            autoComplete="off" onChange={(event) => setQuery(event.currentTarget.value)}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={() => { composing.current = false; }}
            onKeyDown={(event) => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }}
          />
          <button type="submit" aria-label="搜尋" disabled={!query.trim() || phase === "searching"}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="5.8" /><path d="m15 15 4 4" /></svg>
          </button>
        </form>
        {phase === "searching" && <p className="search-planet-loading" role="status">正在找尋星球指南…</p>}
        {phase === "results" && <SearchResultsPanel results={results} failed={failed} />}
      </div>
    </div>
  );
}
