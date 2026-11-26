import { useEffect, useRef, useState, type RefObject } from "react";
import type { SearchPlanetState } from "./useSearchPlanetState";
import { openNativeSearchSplit } from "./native-split";
import "./search.css";

export function SearchOverlay({ state, trigger, dialog }: {
  state: SearchPlanetState;
  trigger: RefObject<HTMLButtonElement | null>;
  dialog: RefObject<HTMLDivElement | null>;
}) {
  const { phase, close } = state;
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [openingSplit, setOpeningSplit] = useState(false);
  const pendingSplit = useRef(false);
  const resultLink = useRef<HTMLAnchorElement>(null);
  const canUseSidebar = () => window.matchMedia("(pointer: fine)").matches || Boolean(window.desktop);
  const dismissSidebar = () => {
    setSubmitted("");
    input.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (submitted) resultLink.current?.focus({ preventScroll: true });
  }, [submitted]);
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
      setSubmitted("");
      trigger.current?.focus({ preventScroll: true });
    }
  }, [phase, trigger, dialog]);

  async function submitDesktop(value: string) {
    if (pendingSplit.current) return;
    if (window.desktop) {
      setSubmitted(value);
      return;
    }
    pendingSplit.current = true;
    setOpeningSplit(true);
    try {
      const opened = await openNativeSearchSplit(value).catch(() => false);
      if (dialog.current?.dataset.phase !== "open") return;
      setSubmitted(opened ? "" : value);
    } finally {
      pendingSplit.current = false;
      setOpeningSplit(false);
    }
  }

  if (phase === "closed") return null;
  return (
    <div
      className="search-planet-overlay"
      data-phase={phase}
      data-sidebar={controlsVisible && !!submitted}
      role="dialog"
      aria-modal="true"
      aria-label="搜尋星球"
      ref={dialog}
      tabIndex={-1}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.stopPropagation();
          if (submitted && controlsVisible) dismissSidebar();
          else close();
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
            } else if (canUseSidebar()) {
              event.preventDefault();
              void submitDesktop(query.trim());
            }
          }}>
          <input ref={input} type="search" name="q" aria-label="Google 搜尋關鍵字" placeholder="用 Google 搜尋"
            value={query} maxLength={200} autoComplete="off" onChange={(event) => setQuery(event.currentTarget.value)}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={() => { composing.current = false; }}
            onKeyDown={(event) => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }}
          />
          <button type="submit" aria-label="搜尋 Google" disabled={!query.trim() || openingSplit} />
        </form>
        {openingSplit && <span className="search-planet-status" role="status">正在開啟右側分割搜尋…</span>}
        {submitted && (
          <aside className="search-planet-sidebar" aria-labelledby="search-planet-sidebar-heading">
            <header>
              <h2 id="search-planet-sidebar-heading">Google 搜尋</h2>
              <button className="search-planet-sidebar-dismiss" type="button" aria-label="關閉搜尋側欄" onClick={dismissSidebar}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </header>
            <p className="search-planet-submitted">{submitted}</p>
            {!window.desktop && <p>若要自動在右側開啟，可安裝支援的 Chrome 擴充套件。</p>}
            <a ref={resultLink} href={`https://www.google.com/search?${new URLSearchParams({ q: submitted })}`}
              target="_blank" rel="noopener noreferrer" onClick={(event) => {
                if (window.desktop?.searchGoogle) {
                  event.preventDefault();
                  window.desktop.searchGoogle(submitted);
                }
              }}>在 Google 查看結果 <span aria-hidden="true">↗</span></a>
          </aside>
        )}
      </div>
    </div>
  );
}
