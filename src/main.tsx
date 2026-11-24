import { Icon } from "./Icon";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Scene from "./Scene";
import { useWorld } from "./store";
import {
  initialTimer,
  pause,
  resume,
  startTimer,
  tick,
  shouldNotify,
  allowedAction,
  type Action,
} from "./domain";
import { fallback, validateReply } from "../shared/dialogue.js";
import "./style.css";
declare global {
  interface Window {
    desktop?: {
      setMode: (mode: string) => Promise<void>;
      hide: () => void;
      quit: () => void;
      onMode: (listener: (mode: string) => void) => () => void;
    };
  }
}
interface Message {
  role: "user" | "assistant";
  content: string;
}
const actionNames: Record<Action, string> = {
  idle: "看看星星",
  walk: "在星球散步",
  read: "陪你讀書",
  rest: "休息一下",
  happy: "替你加油",
  listen: "正在聽你說",
  stretch: "伸個懶腰",
  approach: "靠近陪你",
  return: "回到小角落",
};
function useAmbient() {
  const context = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(false);
  const gain = useRef<GainNode | null>(null);
  const sources = useRef<OscillatorNode[]>([]);
  const stop = () => {
    sources.current.forEach((s) => s.stop());
    sources.current = [];
    void context.current?.close();
    context.current = null;
    setOn(false);
  };
  useEffect(
    () => () => {
      sources.current.forEach((s) => s.stop());
      void context.current?.close();
    },
    [],
  );
  const toggle = async () => {
    if (on) {
      stop();
      return;
    }
    try {
      const c = new AudioContext();
      context.current = c;
      await c.resume();
      gain.current = c.createGain();
      gain.current.gain.value = 0.022;
      gain.current.connect(c.destination);
      [130.81, 196, 261.63].forEach((f) => {
        const o = c.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(gain.current!);
        o.start();
        sources.current.push(o);
      });
      setOn(true);
    } catch {
      stop();
    }
  };
  return { on, toggle };
}
function App() {
  const state = useWorld();
  useEffect(() => {
    const stylesheet = document.getElementById(
      "google-huninn",
    ) as HTMLLinkElement | null;
    const enable = () => {
      if (stylesheet) stylesheet.media = "all";
    };
    stylesheet?.addEventListener("load", enable);
    if (stylesheet?.sheet) enable();
    return () => stylesheet?.removeEventListener("load", enable);
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      document.documentElement.style.setProperty(
        "--visible-height",
        `${viewport?.height ?? window.innerHeight}px`,
      );
      document.documentElement.style.setProperty(
        "--visible-top",
        `${viewport?.offsetTop ?? 0}px`,
      );
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const [pet, setPet] = useState(false);
  const [chat, setChat] = useState(false);
  const [settings, setSettings] = useState(false);
  const minutes = state.focusMinutes;
  const setMinutes = state.setFocusMinutes;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState("檢查連線中");
  const [notice, setNotice] = useState("");
  const [intent, setIntent] = useState("");
  const [activity, setActivity] = useState<Action>("idle");
  const audio = useAmbient();
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((r) => r.json())
      .then((r) =>
        setProvider(r.provider === "llm" ? "AI 已連線" : "本機陪伴模式"),
      )
      .catch(() => setProvider("離線陪伴模式"));
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      const current = useWorld.getState();
      const next = tick(current.timer, Date.now());
      if (next !== current.timer) {
        if (
          shouldNotify(
            current.timer,
            next,
            current.silent,
            current.notifications,
          )
        )
          setNotice("這一小段完成了。起身伸展，喝一口水吧。");
        if (
          next.phase !== current.timer.phase ||
          next.running !== current.timer.running ||
          Math.ceil(next.remaining / 1000) !==
            Math.ceil(current.timer.remaining / 1000)
        )
          current.setTimer(next);
      }
      const a = document.querySelector("canvas")?.dataset.action as Action;
      if (a) setActivity(a);
    }, 200);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (state.silent || !state.notifications) setNotice("");
  }, [state.silent, state.notifications]);
  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: state.reduced ? "instant" : "smooth",
    });
  }, [messages, chat, state.reduced]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => window.desktop?.onMode((mode) => setPet(mode === "pet")), []);
  const mode = async () => {
    const next = !pet;
    if (window.desktop) await window.desktop.setMode(next ? "pet" : "planet");
    setPet(next);
  };
  const begin = (phase: "focus" | "break" = "focus") => {
    state.setTimer(
      startTimer(
        state.timer,
        phase === "break" ? 5 : minutes,
        Date.now(),
        phase,
      ),
    );
    setNotice("");
    setIntent("");
    if (phase === "focus") setChat(false);
  };
  const interact = () => {
    state.react(state.timer.phase === "focus" ? "listen" : "happy");
    if (!state.silent && state.timer.phase !== "focus")
      setNotice("星雲仔輕輕揮了揮手。");
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const id = ++generation.current;
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    request.current = new AbortController();
    const deadline = setTimeout(() => request.current?.abort(), 10_000);
    try {
      let result;
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: request.current.signal,
          body: JSON.stringify({
            message: text,
            phase: state.timer.phase,
            hour: new Date().getHours(),
            history,
          }),
        });
        if (!response.ok) throw new Error("API error");
        const data = await response.json();
        result = { ...validateReply(data), provider: data.provider };
      } catch {
        result = {
          ...fallback(text, state.timer.phase, new Date().getHours()),
          provider: "offline",
        };
      }
      if (id !== generation.current) return;
      setMessages((m) => [
        ...m,
        { role: "assistant", content: result.reply_text },
      ]);
      setProvider(
        result.provider === "llm"
          ? "AI 已連線"
          : result.provider === "mock"
            ? "本機陪伴模式"
            : result.provider === "safety"
              ? "安全協助"
              : "備援陪伴模式",
      );
      setIntent(result.user_intent);
      const latest = useWorld.getState();
      latest.react(
        allowedAction(
          result.suggested_action === "stay_near"
            ? "approach"
            : result.suggested_action,
          latest.timer.phase,
        ),
      );
    } finally {
      clearTimeout(deadline);
      setBusy(false);
    }
  };
  const time = Math.ceil(state.timer.remaining / 1000);
  const display = `${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${(time % 60).toString().padStart(2, "0")}`;
  return (
    <main
      className={pet ? "app pet" : "app"}
      data-phase={state.timer.phase}
      data-activity={activity}
    >
      {!pet && (
        <header>
          <a className="brand" href="#" aria-label="同頻星球首頁">
            <span className="brand-mark">
              <Icon name="orbit" />
            </span>
            <span>
              同頻星球<small>COMPANION PLANET</small>
            </span>
          </a>
          <nav aria-label="陪伴設定">
            {window.desktop && (
              <>
                <button
                  onClick={() => window.desktop?.hide()}
                  aria-label="最小化星球"
                >
                  <Icon name="minimize" />
                </button>
                <button
                  onClick={() => window.desktop?.quit()}
                  aria-label="退出應用程式"
                >
                  <Icon name="close" />
                </button>
              </>
            )}
            <button
              aria-pressed={state.silent}
              onClick={() => state.setSilent(!state.silent)}
            >
              <Icon name="moon" />
              <span>{state.silent ? "已安靜" : "安靜陪我"}</span>
            </button>
            <button
              className="audio-toggle"
              aria-label={audio.on ? "關閉環境音" : "開啟環境音"}
              aria-pressed={audio.on}
              onClick={() => void audio.toggle()}
            >
              <Icon name="sound" />
              <span className="audio-label">
                {audio.on ? " 聲音開啟" : " 環境音"}
              </span>
            </button>
            <button
              aria-label="開啟設定"
              aria-expanded={settings}
              onClick={() => setSettings(!settings)}
            >
              <Icon name="settings" />
            </button>
          </nav>
        </header>
      )}
      <section className="world" aria-label="星雲仔的微型世界">
        {!pet && (
          <div className="stage-label">
            <span>小星球觀察日誌</span>
            <span>NO. 001</span>
          </div>
        )}
        <Scene pet={pet} onClick={interact} reduced={state.reduced} />
      </section>
      {!pet && (
        <>
          <section className="intro">
            <span className="eyebrow">一座小星球，一點剛好的陪伴。</span>
            <h1>
              各自忙碌，
              <br />
              也一起發光。
            </h1>
            <p>
              你專心的時候，
              <br />
              牠也在做自己的事。
            </p>
            <div className="intro-note">
              <Icon name="leaf" />
              <div>
                陪伴，不需要一直說話。
                <small>
                  讀幾頁書、發一會兒呆。
                  <br />
                  這裡沒有需要趕上的進度。
                </small>
              </div>
            </div>
          </section>
          <section className="focus-panel" aria-label="番茄鐘">
            <div className="panel-top">
              <span className="status-dot" />
              {state.timer.phase === "focus"
                ? "一起專注"
                : state.timer.phase === "break"
                  ? "留一點時間休息"
                  : "今天，慢慢來就好"}
              <span className="tiny">專注手帖</span>
            </div>
            <div className="time" role="timer" aria-label="剩餘時間">
              {display}
            </div>
            <p>
              {state.timer.phase === "focus"
                ? "星雲仔正在書桌旁陪你。"
                : state.timer.phase === "break"
                  ? "讓眼睛看看遠方。"
                  : "從一小段專注開始。"}
            </p>
            <div className="duration">
              <label htmlFor="duration">專注時長</label>
              <select
                id="duration"
                value={minutes}
                disabled={state.timer.running}
                onChange={(e) => {
                  setMinutes(Number(e.target.value));
                  if (state.timer.phase === "idle")
                    state.setTimer({
                      ...state.timer,
                      remaining: Number(e.target.value) * 60_000,
                    });
                }}
              >
                <option value={25}>25 分鐘</option>
                <option value={45}>45 分鐘</option>
                <option value={5}>5 分鐘</option>
                <option value={1}>1 分鐘展示</option>
                <option value={1 / 6}>10 秒展示</option>
              </select>
            </div>
            <div className="timer-actions">
              {state.timer.running ? (
                <button
                  className="primary"
                  onClick={() => state.setTimer(pause(state.timer, Date.now()))}
                >
                  <Icon name="pause" /> 暫停
                </button>
              ) : state.timer.phase === "focus" ? (
                <button
                  className="primary"
                  onClick={() =>
                    state.setTimer(resume(state.timer, Date.now()))
                  }
                >
                  繼續專注 <Icon name="play" />
                </button>
              ) : (
                <button className="primary" onClick={() => begin()}>
                  開始專注 <Icon name="arrow" />
                </button>
              )}
              <button
                aria-label="重設計時器"
                onClick={() => {
                  state.setTimer({
                    ...initialTimer,
                    remaining: minutes * 60_000,
                    completed: state.timer.completed,
                  });
                  setNotice("");
                }}
              >
                <Icon name="reset" />
              </button>
            </div>
            {state.timer.phase === "break" && !state.timer.running && (
              <button className="text-button" onClick={() => begin("break")}>
                開始 5 分鐘休息
              </button>
            )}
            <div className="focus-footer">
              <span>每一小步，都算數。</span>
              <span>{state.timer.completed} 段完成</span>
            </div>
          </section>
          <div className="character-caption">
            <span className="live-dot" />
            <b>星雲仔</b>
            <span>· {actionNames[activity]}</span>
            <button className="text-button" onClick={interact}>
              打個招呼 <Icon name="hand" />
            </button>
          </div>
          <div className="orbit-hint">
            <Icon name="move" /> 拖曳旋轉 <span>／</span> 滾輪或雙指縮放
          </div>
          <footer>
            <span>
              同頻星球 <span className="footer-divider">／</span>{" "}
              各自忙碌，也一起生活。
            </span>
            <button onClick={() => void mode()}>
              <Icon name="expand" />{" "}
              {window.desktop ? "切換桌寵模式" : "體驗迷你陪伴"}
            </button>
          </footer>
        </>
      )}
      {pet && (
        <>
          <div className="pet-handle" title="拖曳這裡移動桌寵">
            <Icon name="move" /> 星雲仔 <span>{display}</span>
          </div>
          <div className="pet-controls">
            <button onClick={() => void mode()} aria-label="返回星球">
              <Icon name="expand" />
            </button>
            <button onClick={() => setChat(!chat)} aria-label="桌寵聊天">
              <Icon name="chat" />
            </button>
            {window.desktop && (
              <>
                <button
                  onClick={() => window.desktop?.hide()}
                  aria-label="隱藏桌寵"
                >
                  <Icon name="minimize" />
                </button>
                <button
                  onClick={() => window.desktop?.quit()}
                  aria-label="退出應用程式"
                >
                  <Icon name="close" />
                </button>
              </>
            )}
          </div>
        </>
      )}
      {notice && !state.silent && (
        <div className="notice" role="status">
          <Icon name="leaf" /> {notice}
          <button aria-label="關閉提示" onClick={() => setNotice("")}>
            <Icon name="close" />
          </button>
        </div>
      )}
      {!pet && (
        <button
          className="chat-launch"
          aria-expanded={chat}
          onClick={() => setChat(!chat)}
        >
          <Icon name="chat" />
          <div>
            和星雲仔說說話<small>{provider}</small>
          </div>
          <Icon name={chat ? "minimize" : "arrow"} />
        </button>
      )}
      {chat && (
        <section className="chat-panel" aria-label="與星雲仔對話">
          <div className="chat-heading">
            <div>
              星雲仔 <small>{provider}</small>
            </div>
            <button aria-label="收合聊天" onClick={() => setChat(false)}>
              <Icon name="close" />
            </button>
          </div>
          <p className="privacy">
            AI 陪伴角色，非真人。
            {provider === "AI 已連線"
              ? "文字將傳送至 AI 服務。"
              : "目前由本機陪伴模式回應。"}
            對話只暫存在這個視窗。
          </p>
          <div className="messages" aria-live="polite">
            {messages.length === 0 && (
              <p className="welcome">
                嗨，我是星雲仔。
                <br />
                想說點什麼，或只是一起安靜待著，都可以。
              </p>
            )}
            {messages.map((m, i) => (
              <div className={`message ${m.role}`} key={i}>
                {m.content}
              </div>
            ))}
            {busy && <p>星雲仔正在想一想…</p>}
            <div ref={end} />
          </div>
          {intent === "start_focus" && (
            <button className="suggestion" onClick={() => begin()}>
              確認開始專注
            </button>
          )}
          {intent === "take_break" && (
            <button className="suggestion" onClick={() => begin("break")}>
              確認開始休息
            </button>
          )}
          {intent === "be_quiet" && (
            <button
              className="suggestion"
              onClick={() => {
                state.setSilent(true);
                setIntent("");
              }}
            >
              確認安靜陪我
            </button>
          )}
          <form onSubmit={send}>
            <label className="sr-only" htmlFor="message">
              想對星雲仔說的話
            </label>
            <input
              id="message"
              maxLength={600}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="今天過得怎麼樣？"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="送出訊息"
            >
              <Icon name="arrow" style={{ transform: "rotate(-90deg)" }} />
            </button>
          </form>
        </section>
      )}
      {settings && !pet && (
        <section className="settings" aria-label="設定">
          <h2>舒服地待著</h2>
          <label>
            <input
              type="checkbox"
              checked={state.reduced}
              onChange={(e) => state.setReduced(e.target.checked)}
            />
            減少動畫
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.notifications}
              onChange={(e) => state.setNotifications(e.target.checked)}
            />
            專注結束時提醒一次
          </label>
          <p>計時和偏好儲存在此裝置；不使用攝影機或麥克風。</p>
          <button
            onClick={() => {
              generation.current++;
              request.current?.abort();
              state.clear();
              setMessages([]);
              setIntent("");
              setNotice("");
            }}
          >
            清除本機資料與對話
          </button>
        </section>
      )}
    </main>
  );
}
const Review = import.meta.env.DEV
  ? React.lazy(() => import("./art/ArtReview"))
  : () => null;
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {import.meta.env.DEV &&
    new URLSearchParams(location.search).has("art-review") ? (
      <React.Suspense fallback={<p>載入 3D 驗收場景…</p>}>
        <Review />
      </React.Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
