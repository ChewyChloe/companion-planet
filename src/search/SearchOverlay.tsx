import { useEffect, useRef, useState, type RefObject } from "react";
import type { SearchPlanetState } from "./useSearchPlanetState";
import { googleSearchUrl, openSearchWindow } from "./open-search-window";
import "./search.css";

export function SearchOverlay({ state, trigger, dialog }: {
  state: SearchPlanetState;
  trigger: RefObject<HTMLButtonElement | null>;
  dialog: RefObject<HTMLDivElement | null>;
}) {
  const { phase, close } = state;
  const [query, setQuery] = useState("");
  const [blockedUrl, setBlockedUrl] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const involved = useRef(false);
  const controlsVisible = phase === "open";
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
      setQuery("");
      setBlockedUrl("");
      trigger.current?.focus({ preventScroll: true });
    }
  }, [phase, trigger, dialog]);

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
      {phase === "opening" && <span className="search-planet-status" role="status">正在開啟搜尋星球…</span>}
      <div className="search-planet-controls" inert={!controlsVisible}>
        <button className="search-planet-close" type="button" aria-label="關閉搜尋星球" onClick={close}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <form className="search-planet-form" action="https://www.google.com/search" method="get"
          target="_blank" rel="noopener noreferrer" onSubmit={(event) => {
            if (composing.current || !query.trim()) {
              event.preventDefault();
            } else if (window.desktop) {
              event.preventDefault();
              window.desktop.searchGoogle(query.trim());
            } else if (window.matchMedia("(pointer: fine)").matches) {
              event.preventDefault();
              const url = googleSearchUrl(query.trim());
              setBlockedUrl(openSearchWindow(url) ? "" : url);
            }
          }}>
          <input ref={input} type="search" name="q" aria-label="Google 搜尋關鍵字" placeholder="搜尋"
            value={query} maxLength={200} autoComplete="off" onChange={(event) => setQuery(event.currentTarget.value)}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={() => { composing.current = false; }}
            onKeyDown={(event) => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }}
          />
          <button type="submit" aria-label="搜尋 Google" disabled={!query.trim()} />
        </form>
        {blockedUrl && (
          <div className="search-window-fallback">
            <span role="status">瀏覽器阻擋了搜尋視窗</span>
            <a href={blockedUrl} target="_blank" rel="noopener noreferrer">在 Google 查看結果</a>
          </div>
        )}
      </div>
    </div>
  );
}
