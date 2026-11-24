import { getNebulaMaterialVariant, nebulaMaterialVariants } from "./art/nebula-material-test";
import { planetFor } from "./planets";
import { CompanionPicker } from "./CompanionPicker";
import { companionFor, randomGreeting } from "./companions";
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
      beginGrab: () => void;
      moveGrab: () => void;
      endGrab: () => void;
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
function NebulaMaterialPanel() {
  const variant = getNebulaMaterialVariant();
  const companion = useWorld(s => s.companionId);
  useEffect(() => {
    if (variant && companion !== "nebula") useWorld.getState().setCompanion("nebula");
  }, [variant, companion]);
  if (!variant) return null;
  return <aside aria-label="星雲仔材質測試" style={{ position: "fixed", top: "26%", left: 12, zIndex: 25, padding: 12, background: "#f4f1e8", color: "#4f5861", maxWidth: 260, fontSize: 14 }}>
    <strong>星雲仔・網頁材質測試</strong>
    <p>同一模型與實際星球燈光，可旋轉查看動作和表情。</p>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {Object.entries(nebulaMaterialVariants).map(([id,p]) => <a key={id} href={`?nebula-material=${id}`} aria-current={id === variant ? "page" : undefined}>{p.name}</a>)}
    </div>
    <p><a href={`?art-review&nebula-material=${variant}`}>近照／旋轉檢視</a> · <a href="/">離開測試</a></p>
    <small>手機使用輕量薄殼；桌面使用實際透射。尚未製作新動畫。</small>
  </aside>;
}
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
  const [picker, setPicker] = useState(false);
  const [speech, setSpeech] = useState("");
  const lastGreeting = useRef(-1);
  useEffect(() => {
    if (state.silent) setSpeech("");
  }, [state.silent]);
  const selected = companionFor(state.companionId);
  const planet = planetFor(state.planetId);
  useEffect(() => setSpeech(""), [state.planetId]);
  useEffect(() => {
    if (!speech) return;
    const timer = setTimeout(() => setSpeech(""), 5500);
    return () => clearTimeout(timer);
  }, [speech]);
  const [pet, setPet] = useState(false);
  const [chat, setChat] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPicker(false);
        setSpeech("");
        setChat(false);
        setTimerOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
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
    setChat(false);
    setTimerOpen(false);
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
    setTimerOpen(false);
    if (phase === "focus") setChat(false);
  };
  const interact = () => {
    const greeting = randomGreeting(
      lastGreeting.current,
      state.silent,
      state.timer.phase === "focus",
    );
    lastGreeting.current = greeting.index;
    state.react(greeting.action);
    setSpeech(greeting.text);
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
            companionId: state.companionId,
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
      data-planet={state.planetId}
      data-time-of-day={state.night ? "night" : "day"}
      data-phase={state.timer.phase}
      data-activity={activity}
    >
      <section className="world" aria-label="星雲仔的微型世界">
        <Scene
          pet={pet}
          onClick={interact}
          reduced={state.reduced}
          speech={speech}
        />
      </section>
      {!pet && (
        <>
          {window.desktop && <div className="window-drag" />}
          <section className="focus-hud" aria-label="番茄鐘">
            <button
              className="time-card"
              aria-label="計時設定"
              aria-expanded={timerOpen}
              aria-controls="timer-settings"
              onClick={() => {
                setTimerOpen(!timerOpen);
              }}
            >
              <span className="time" role="timer" aria-label="剩餘時間">
                {display}
              </span>
            </button>
            <div className="timer-buttons">
              <button
                className="round-control"
                aria-label={
                  state.timer.running
                    ? "暫停"
                    : state.timer.phase === "focus"
                      ? "繼續專注"
                      : "開始專注"
                }
                onClick={() =>
                  state.timer.running
                    ? state.setTimer(pause(state.timer, Date.now()))
                    : state.timer.phase === "focus"
                      ? state.setTimer(resume(state.timer, Date.now()))
                      : begin()
                }
              >
                <Icon name={state.timer.running ? "pause" : "play"} />
              </button>
              <button
                className="round-control"
                aria-label="安靜陪我"
                aria-pressed={state.silent}
                title={state.silent ? "已開啟安靜陪伴" : "安靜陪我"}
                onClick={() => state.setSilent(!state.silent)}
              >
                <Icon name={state.silent ? "moon" : "mute"} />
              </button>
            </div>
          </section>
          <nav className="scene-tools" aria-label="陪伴設定">
            <button
              className="round-control"
              aria-label={state.night ? "切換為白天" : "切換為夜晚"}
              aria-pressed={state.night}
              title={state.night ? "切換為白天" : "切換為夜晚"}
              onClick={() => state.toggleNight()}
            >
              <Icon name={state.night ? "moon" : "settings"} />
            </button>
            <button
              className="round-control"
              aria-label={audio.on ? "關閉環境音" : "開啟環境音"}
              aria-pressed={audio.on}
              onClick={() => void audio.toggle()}
            >
              <Icon name={audio.on ? "sound" : "mute"} />
            </button>
          </nav>
          {timerOpen && (
            <section
              className="timer-popover floating-panel"
              id="timer-settings"
              aria-label="計時設定"
            >
              <div className="panel-heading">
                <h2>留一段時間給自己</h2>
                <button
                  aria-label="收合計時設定"
                  onClick={() => setTimerOpen(false)}
                >
                  <Icon name="close" />
                </button>
              </div>
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
                        remaining: Number(e.target.value) * 60000,
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
              <div className="popover-actions">
                <span>{state.timer.completed} 段完成</span>
                <button
                  aria-label="重設計時器"
                  onClick={() => {
                    state.setTimer({
                      ...initialTimer,
                      remaining: minutes * 60000,
                      completed: state.timer.completed,
                    });
                    setNotice("");
                  }}
                >
                  <Icon name="reset" />
                  重新開始
                </button>
              </div>
              {state.timer.phase === "break" && !state.timer.running && (
                <button onClick={() => begin("break")}>開始 5 分鐘休息</button>
              )}
            </section>
          )}
          <div
            key={state.planetId}
            className={`planet-arrival ${state.reduced ? "still" : ""}`}
            aria-live="polite"
          >
            <span>{planet.short}</span>
          </div>
          <div className="explore-dock" role="group" aria-label="星球互動">
            <span className="planet-address">{planet.short}</span>
            <button
              aria-label={state.lampOn ? "關閉桌燈" : "開啟桌燈"}
              aria-pressed={state.lampOn}
              onClick={state.toggleLamp}
            >
              <Icon name="settings" />
              <span>桌燈</span>
            </button>
            <button
              onClick={() => {
                useWorld.setState({ destination: null });
                state.react("read");
              }}
            >
              <Icon name="leaf" />
              <span>讀書</span>
            </button>
            <button
              onClick={() => {
                useWorld.setState({ destination: null });
                state.react("rest");
              }}
            >
              <Icon name="moon" />
              <span>休息</span>
            </button>
            <button
              aria-label="照顧花朵"
              aria-pressed={state.flowersBloom}
              onClick={state.toggleFlowers}
            >
              <Icon name="leaf" />
              <span>{state.flowersBloom ? "花開了" : "澆花"}</span>
            </button>
          </div>
          <div className="scene-caption">
            <h1>同頻星球</h1>
            <button
              className="caption-greeting"
              onClick={interact}
              aria-label="打個招呼"
            >
              <span>
                {selected.name} · {actionNames[activity]}
              </span>
              <Icon name="hand" />
            </button>
          </div>
          <div className="companion-tools">
            <button
              className="round-control"
              onClick={() => setPicker(!picker)}
              aria-label="更換角色"
              aria-expanded={picker}
              title="更換角色"
            >
              <Icon name="orbit" />
            </button>
            <button
              className="round-control"
              onClick={() => void mode()}
              aria-label={window.desktop ? "切換桌寵模式" : "體驗迷你陪伴"}
              title="迷你陪伴"
            >
              <Icon name="expand" />
            </button>
          </div>
        </>
      )}
      {picker && (
        <CompanionPicker
          selected={state.companionId}
          onClose={() => setPicker(false)}
          onSelect={(id) => {
            state.setCompanion(id);
            setSpeech("");
            setPicker(false);
          }}
        />
      )}
      {pet && (
        <>
          <div className="pet-handle" title="拖曳這裡移動桌寵">
            <Icon name="move" /> {selected.name} <span>{display}</span>
          </div>
          <div className="pet-controls">
            <button onClick={() => setPicker(!picker)} aria-label="更換角色">
              <Icon name="orbit" />
            </button>
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
          className="chat-launch round-control"
          aria-label={`和${selected.name}說說話`}
          title={`和${selected.name}說說話`}
          aria-expanded={chat}
          onClick={() => setChat(!chat)}
        >
          <Icon name="chat" />
        </button>
      )}
      {chat && (
        <section className="chat-panel" aria-label={`與${selected.name}對話`}>
          <div className="chat-heading">
            <div>
              {selected.name} <small>{provider}</small>
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
                嗨，我是{selected.name}。
                <br />
                想說點什麼，或只是一起安靜待著，都可以。
              </p>
            )}
            {messages.map((m, i) => (
              <div className={`message ${m.role}`} key={i}>
                {m.content}
              </div>
            ))}
            {busy && <p>{selected.name}正在想一想…</p>}
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
              想對{selected.name}說的話
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
    </main>
  );
}
const Review = React.lazy(() => import("./art/ArtReview"));
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NebulaMaterialPanel />
    {new URLSearchParams(location.search).has("art-review") ? (
      <React.Suspense fallback={<p>載入 3D 驗收場景…</p>}>
        <Review />
      </React.Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
