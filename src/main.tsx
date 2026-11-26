import { useTimerChime } from "./useTimerChime";
import { PomodoroHud } from "./PomodoroHud";
import { usePlanetMusic } from "./usePlanetMusic";
import { getNebulaMaterialVariant, nebulaMaterialVariants } from "./art/nebula-material-test";
import { planetFor } from "./planets";
import { CompanionPicker } from "./CompanionPicker";
import { companionFor } from "./companions";
import { dialogueActions, dialogueMood, type TapMood, lateNightLine, tapDialogue } from "./tap-dialogue";
import { Icon } from "./Icon";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { ClockPet } from "./pip/ClockPet";
import { useClockPet } from "./pip/useClockPet";
import "./pip/clock-pet.css";
import Scene from "./Scene";
import { useWorld } from "./store";
import {
  allowedAction,
  type Action,
  type Timer,
} from "./domain";
import { fallback, urgent, validateReply } from "../shared/dialogue.js";
import "./style.css";
declare global {
  interface Window {
    desktop?: {
      searchGoogle: (query: string) => void;
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
const ambientLines = [
  "剛才有一顆星星眨眼，你有看到嗎？",
  "我找到一個風剛剛好的角落",
  "今天的雲，看起來很適合靠一下",
  "我散步回來啦，順便帶了一點星光",
  "想發呆的話，可以算我一個",
  "聽，窗外的風又換了一首歌",
];
const focusCheers = [
  "叮！這一段完成啦，伸個懶腰吧",
  "把一顆星球收進口袋！這段很值得記住",
  "做完啦！剛才跑掉的注意力也可以回來休息了",
  "這一頁先夾起來，我替你拍兩下手！",
];
const breakReminders = [
  "休息時間到了，準備好就一起回書桌",
  "椅子還暖著，你可以慢慢坐回來",
  "這一小段歇夠了嗎？下一頁在等我們",
];
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
  const nightLineUntil = useRef(0);
  const taps = useRef({ count: 0, at: 0 });
  const [speechVersion, setSpeechVersion] = useState(0);
  const speechUntil = useRef(0);
  const showSpeech = useCallback((text: string) => {
    speechUntil.current = Date.now() + 5500;
    setSpeech(text);
    setSpeechVersion(version => version + 1);
  }, []);
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
  }, [speech, speechVersion]);
  const [pet, setPet] = useState(false);
  const clockPet = useClockPet();
  const clockFace = useRef<HTMLDivElement>(null);
  const [clockCelebration, setClockCelebration] = useState(0);
  const [chat, setChat] = useState(false);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPicker(false);
        setSpeech("");
        setChat(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState("檢查連線中");
  const [notice, setNotice] = useState("");
  const [intent, setIntent] = useState("");
  const [activity, setActivity] = useState<Action>("idle");
  const audio = usePlanetMusic(state.planetId);
  const { arm: armChime, ring: ringChime } = useTimerChime();
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((r) => r.json())
      .then((r) =>
        setProvider(r.provider === "llm" ? "AI 已設定，待測試" : "本機陪伴模式"),
      )
      .catch(() => setProvider("離線陪伴模式"));
    return () => controller.abort();
  }, []);
  const lastCompletionLine = useRef("");
  const notifyCompletion = useCallback((previous: Timer) => {
    const { silent, timerSettings, cueTimerGesture } = useWorld.getState();
    const focused = previous.phase === "focus";
    setClockCelebration(count => count + 1);
    const title = focused ? "專注完成，可以休息一下" : "休息完成，準備好了再開始";
    setNotice(title);
    if (silent) return;
    if (timerSettings.sound) ringChime(focused ? "focus" : "break", timerSettings.volume);
    const lines = (focused ? focusCheers : breakReminders).filter(line => line !== lastCompletionLine.current);
    const line = lines[Math.floor(Math.random() * lines.length)];
    lastCompletionLine.current = line;
    showSpeech(line);
    cueTimerGesture(focused ? "happy" : "listen", 1450);
    try {
      if (timerSettings.desktopNotifications && typeof Notification !== "undefined" && Notification.permission === "granted")
        new Notification(title, { body: line, tag: "companion-planet-timer" });
    } catch {
      // Some browsers only support notifications through a service worker.
    }
  }, [ringChime, showSpeech]);
  useEffect(() => {
    const advance = () => {
      const completion = useWorld.getState().advanceTimer(Date.now());
      if (completion) notifyCompletion(completion);
    };
    const timerHost = clockPet.host ?? window;
    const id = timerHost.setInterval(() => {
      advance();
      const a = document.querySelector(".world canvas")?.getAttribute("data-action") as Action | null;
      if (a) setActivity(a);
    }, 200);
    const prime = () => {
      if (useWorld.getState().timer.running) void armChime();
    };
    document.addEventListener("visibilitychange", advance);
    window.addEventListener("pointerup", prime);
    window.addEventListener("keydown", prime);
    return () => {
      timerHost.clearInterval(id);
      document.removeEventListener("visibilitychange", advance);
      window.removeEventListener("pointerup", prime);
      window.removeEventListener("keydown", prime);
    };
  }, [notifyCompletion, armChime, clockPet.host]);
  const lastAmbient = useRef(-1);
  useEffect(() => {
    if (state.silent || state.timer.phase !== "idle" || state.companionId !== "nebula" || picker || chat || pet) return;
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        const latest = useWorld.getState();
        if (!document.hidden && !latest.silent && latest.timer.phase === "idle" && !latest.journey
          && Date.now() >= Math.max(speechUntil.current, latest.reactionUntil)) {
          const canvas = document.querySelector(".world canvas") as HTMLCanvasElement | null;
          const action = canvas?.dataset.action;
          if (!latest.reduced && action === "idle" && Math.random() < .42) {
            latest.react("happy", "joy");
          } else if (action === "walk" || action === "idle") {
            lastAmbient.current = (lastAmbient.current + 1 + Math.floor(Math.random() * (ambientLines.length - 1))) % ambientLines.length;
            showSpeech(ambientLines[lastAmbient.current]);
          }
        }
        schedule();
      }, 38_000 + Math.random() * 42_000);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [state.silent, state.timer.phase, state.companionId, picker, chat, pet, showSpeech]);
  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: state.reduced ? "instant" : "smooth",
    });
  }, [messages, chat, state.reduced]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => window.desktop?.onMode((mode) => setPet(mode === "pet")), []);
  const mode = async () => {
    setChat(false);
    const next = !pet;
    if (window.desktop) await window.desktop.setMode(next ? "pet" : "planet");
    setPet(next);
  };
  const timerCommand = (command: "start" | "pause" | "reset" | "skip", stage?: "focus" | "break") => {
    const now = Date.now();
    const completed = useWorld.getState().advanceTimer(now);
    if (completed) {
      notifyCompletion(completed);
      if (command === "pause") return;
    }
    const latest = useWorld.getState();
    latest.timerCommand(command, now, stage);
    const timer = useWorld.getState().timer;
    if (command !== "pause") setNotice("");
    if (command !== "start" || latest.timer.running || !timer.running) return;
    const resting = timer.phase === "break";
    if (!latest.timer.started || (stage && stage !== latest.timer.phase)) {
      if (!latest.silent) {
        latest.cueTimerGesture(resting ? "stretch" : "happy", resting ? 1700 : 1150);
        if (resting) showSpeech("先把肩膀放下來，我也伸個懶腰");
      }
      if (!resting && latest.timerSettings.sound && !latest.silent)
        void armChime().then(() => ringChime("start", useWorld.getState().timerSettings.volume));
      else void armChime();
    } else void armChime();
    setIntent("");
    if (!resting) setChat(false);
  };
  const begin = (phase: "focus" | "break" = "focus") => timerCommand("start", phase);
  const previewTimerSound = () => {
    void armChime().then(() => ringChime("focus", useWorld.getState().timerSettings.volume));
  };
  const interact = () => {
    const now = Date.now();
    const count = now - taps.current.at < 950 ? taps.current.count + 1 : 1;
    taps.current = { at: now, count };
    const focusing = state.timer.phase === "focus" && state.timer.running;
    const hour = new Date(now).getHours();
    const greeting = tapDialogue(lastGreeting.current, count, focusing, hour, Math.random, now >= nightLineUntil.current);
    const lateNight = greeting.text === lateNightLine;
    if (lateNight && !state.silent) nightLineUntil.current = now + 5 * 60_000;
    lastGreeting.current = greeting.index;
    const mood = dialogueMood(greeting.index, count, focusing, lateNight);
    state.react(dialogueActions[mood], mood);
    if (!state.silent) showSpeech(greeting.text);
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const id = ++generation.current;
    const history = messages.slice(-10);
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
          ...fallback(text, state.timer.phase, new Date().getHours(), { history, companionId: state.companionId }),
          provider: urgent(text) ? "safety" : "offline",
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
        latest.timer.phase === "focus" ? undefined : ((result.mood ?? undefined) as TapMood | undefined),
      );
    } finally {
      clearTimeout(deadline);
      setBusy(false);
    }
  };
  const audioLabel = audio.on ? "關閉環境音" : "開啟環境音";
  return (
    <main
      className={pet ? window.desktop ? "app pet native-pet" : "app pet" : "app"}
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
          pickerOpen={picker}
        />
      </section>
      {(!pet || !window.desktop) && (
        <PomodoroHud onCommand={timerCommand} previewSound={previewTimerSound}
          clockPet={!window.desktop && !pet ? clockPet : undefined} />
      )}
      {clockPet.host && createPortal(
        <ClockPet host={clockPet.host} face={clockFace} celebration={clockCelebration} onCommand={timerCommand} onReturn={clockPet.close} />,
        clockPet.host.document.body,
      )}
      {clockPet.fallback && (
        <aside className="clock-pet-fallback">
          <p role="status">{clockPet.fallback}</p>
          <ClockPet host={window} face={clockFace} celebration={clockCelebration} onCommand={timerCommand} onReturn={clockPet.close} />
        </aside>
      )}
      {!pet && (
        <>
          {window.desktop && <div className="window-drag" />}
          <nav className="scene-tools" aria-label="陪伴設定">
            {window.desktop && (
              <>
                <button className="round-control control-tooltip" aria-label="召喚桌寵"
                  data-tooltip="召喚桌寵" onClick={() => void mode()}>
                  <Icon name="monitor" />
                </button>
                <button className="round-control control-tooltip" aria-label="關閉視窗"
                  data-tooltip="關閉視窗" onClick={() => window.desktop?.hide()}>
                  <Icon name="close" />
                </button>
              </>
            )}
            <button
              className="round-control control-tooltip"
              aria-label={state.night ? "切換為白天" : "切換為夜晚"}
              aria-pressed={state.night}
              data-tooltip={state.night ? "切換為白天" : "切換為夜晚"}
              onClick={() => state.toggleNight()}
            >
              <Icon name={state.night ? "moon" : "settings"} />
            </button>
            <button
              className="round-control control-tooltip"
              aria-label={audioLabel}
              data-planet-audio
              data-tooltip={audioLabel}
              aria-pressed={audio.on}
              onClick={() => void audio.toggle()}
            >
              <Icon name={audio.on ? "sound" : "mute"} />
            </button>
          </nav>
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
              className="round-control control-tooltip dock-tooltip"
              onClick={() => setPicker(!picker)}
              aria-label="更換角色"
              aria-expanded={picker}
              data-tooltip="更換角色"
            >
              <Icon name="orbit" />
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
          {!window.desktop && (
            <div className="pet-handle" title="拖曳這裡移動桌寵">
              <Icon name="move" /> {selected.name}
            </div>
          )}
          <div className="pet-controls">
            {window.desktop && (
              <button onClick={() => timerCommand(state.timer.running ? "pause" : "start")}
                aria-label={state.timer.running ? "暫停星球鐘" : state.timer.started ? "繼續星球鐘" : "開始星球鐘"}>
                <Icon name={state.timer.running ? "pause" : "play"} />
              </button>
            )}
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
      {notice && (
        <div className="notice" role="status">
          <Icon name="leaf" /> {notice}
          <button aria-label="關閉提示" onClick={() => setNotice("")}>
            <Icon name="close" />
          </button>
        </div>
      )}
      {!pet && (
        <button
          className="chat-launch round-control control-tooltip dock-tooltip"
          aria-label={`和${selected.name}說說話`}
          data-tooltip={`和${selected.name}說說話`}
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
const UserWorldReview = React.lazy(() => import("./art/UserWorldReview"));
const Review = React.lazy(() => import("./art/ArtReview"));
const NebulaExpressionReview = import.meta.env.DEV
  ? React.lazy(() => import("./art/NebulaExpressionReview"))
  : null;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NebulaMaterialPanel />
    {NebulaExpressionReview && new URLSearchParams(location.search).has("nebula-expressions") ? (
      <React.Suspense fallback={<p>載入模型…</p>}><NebulaExpressionReview /></React.Suspense>
    ) : new URLSearchParams(location.search).has("world-model-review") ? (
      <React.Suspense fallback={<p>載入模型…</p>}><UserWorldReview /></React.Suspense>
    ) : new URLSearchParams(location.search).has("art-review") ? (
      <React.Suspense fallback={<p>載入 3D 驗收場景…</p>}>
        <Review />
      </React.Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
