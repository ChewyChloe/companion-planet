import { useId, useRef, useState, type CSSProperties } from "react";
import { dailyFocus, formatTimerPart, localDay } from "./domain";
import { Icon } from "./Icon";
import { useWorld } from "./store";
import { TimerInput } from "./TimerInput";

type Command = "start" | "pause" | "reset" | "skip";
const durationFields = [
  ["focusMinutes", "專注", "orbit", "focus"],
  ["shortMinutes", "短休息", "sunrise", "short"],
  ["longMinutes", "長休息", "moon", "long"],
] as const;

function TimerSwitch({ label, icon, checked, onChange }: {
  label: string;
  icon: "bolt" | "bell" | "monitor";
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="clock-switch-row">
      <Icon name={icon} />
      <span>{label}</span>
      <input className="clock-switch" type="checkbox" checked={checked}
        onChange={event => onChange(event.currentTarget.checked)} />
    </label>
  );
}

export function PomodoroHud({ onCommand, previewSound }: {
  onCommand: (command: Command) => void;
  previewSound: () => void;
}) {
  const state = useWorld();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeSettings = () => {
    setSettingsOpen(false);
    toggleRef.current?.focus();
  };
  const [notificationFeedback, setNotificationFeedback] = useState("");
  const { timer, timerSettings: settings } = state;
  const seconds = Math.ceil(timer.remaining / 1000);
  const display = `${formatTimerPart(Math.floor(seconds / 60))}:${formatTimerPart(seconds % 60)}`;
  const resting = timer.phase === "break";
  const stage = resting ? timer.breakKind === "long" ? "長休息" : "短休息" : "專注";
  const label = timer.running ? "暫停" : timer.started
    ? resting ? "繼續休息" : "繼續專注"
    : resting ? "開始休息" : "開始專注";
  const days = dailyFocus(state.focusRecords);
  const today = days.get(localDay(Date.now())) ?? { count: 0, minutes: 0 };
  const totalMinutes = [...days.values()].reduce((total, day) => total + day.minutes, 0);

  const toggleDesktop = async (enabled: boolean) => {
    if (!enabled) {
      setNotificationFeedback("");
      state.updateTimerSettings({ desktopNotifications: false });
      return;
    }
    try {
      const granted = typeof Notification !== "undefined"
        && await Notification.requestPermission() === "granted";
      state.updateTimerSettings({ desktopNotifications: granted });
      setNotificationFeedback(granted ? "桌面通知已啟用" : "將使用介面提示");
    } catch {
      setNotificationFeedback("將使用介面提示");
    }
  };

  return (
    <section className="focus-hud" aria-label="星球鐘" data-settings-open={settingsOpen}>
      <div className="time-card">
        {timer.running
          ? <span className="time time-display" role="timer" aria-label="剩餘時間">{display}</span>
          : <TimerInput seconds={seconds} onChange={state.editTimer} />}
        <span className="timer-stage">{stage} · {timer.round ?? 0}/{settings.longEvery} 輪</span>
        {(timer.started || timer.custom) && (
          <button className="timer-reset control-tooltip" aria-label="重新開始" data-tooltip="重新開始"
            onClick={() => onCommand("reset")}>
            <Icon name="reset" />
          </button>
        )}
      </div>
      <div className="timer-buttons">
        <button className="round-control control-tooltip" aria-label={label} data-tooltip={label}
          onClick={() => onCommand(timer.running ? "pause" : "start")}>
          <Icon name={timer.running ? "pause" : "play"} />
        </button>
        <button className="round-control control-tooltip" aria-label="安靜陪我" aria-pressed={state.silent}
          data-tooltip={state.silent ? "已開啟安靜陪伴" : "安靜陪我"}
          onClick={() => state.setSilent(!state.silent)}>
          <Icon name={state.silent ? "bell-off" : "bell"} />
        </button>
        <button ref={toggleRef} className="round-control timer-settings-toggle control-tooltip"
          aria-label="星球鐘設定與紀錄" aria-expanded={settingsOpen} aria-controls={settingsOpen ? settingsId : undefined}
          data-tooltip="星球鐘設定與紀錄"
          onClick={() => setSettingsOpen(open => !open)}><Icon name="sliders" /></button>
      </div>
      {settingsOpen && (
        <section id={settingsId} className="pomodoro-settings" aria-label="計時設定與紀錄"
          onKeyDown={event => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeSettings();
            }
          }}>
          <div className="clock-scroll">
            <div className="pomodoro-heading">
              <h2><span className="clock-emblem"><Icon name="orbit" /></span>星球鐘設定</h2>
              <button className="clock-pill" type="button" onClick={() => { onCommand("skip"); closeSettings(); }}>
                <Icon name="skip" />跳過階段
              </button>
              <button className="clock-close" type="button" aria-label="關閉星球鐘設定" onClick={closeSettings}>
                <Icon name="close" />
              </button>
            </div>
            <div className="pomodoro-durations">
              {durationFields.map(([key, name, icon, theme]) => (
                <label key={key} className={`clock-duration clock-duration-${theme}`}>
                  <span className="clock-duration-icon"><Icon name={icon} /></span>
                  <span className="clock-duration-name">{name}</span>
                  <span className="clock-duration-value">
                    <input key={settings[key]} aria-label={`${name}（分鐘）`} type="number" min={.02}
                      max={99.98} step="any" defaultValue={Number(settings[key].toFixed(2))} inputMode="decimal"
                      onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }}
                      onBlur={event => {
                        const value = event.currentTarget.valueAsNumber;
                        if (Number.isFinite(value) && value > 0 && value !== Number(settings[key].toFixed(2)))
                          state.updateTimerSettings({ [key]: value });
                        else event.currentTarget.value = String(Number(settings[key].toFixed(2)));
                      }} />
                    <span>分</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="clock-interval">
              <Icon name="reset" />
              <span>幾顆星球後長休息</span>
              <div className="clock-stepper" role="group" aria-label="長休息間隔">
                <button type="button" aria-label="減少長休息間隔" disabled={settings.longEvery <= 1}
                  onClick={() => state.updateTimerSettings({ longEvery: settings.longEvery - 1 })}><Icon name="minus" /></button>
                <output aria-label="長休息間隔輪數">{settings.longEvery}</output>
                <button type="button" aria-label="增加長休息間隔" disabled={settings.longEvery >= 12}
                  onClick={() => state.updateTimerSettings({ longEvery: settings.longEvery + 1 })}><Icon name="plus" /></button>
              </div>
            </div>
            <TimerSwitch label="自動開始下一階段" icon="bolt" checked={settings.autoStart}
              onChange={autoStart => state.updateTimerSettings({ autoStart })} />
            <div className="pomodoro-sound">
              <TimerSwitch label="提示音" icon="bell" checked={settings.sound}
                onChange={sound => state.updateTimerSettings({ sound })} />
              <button type="button" className="clock-pill" onClick={previewSound}><Icon name="play" />試聽</button>
            </div>
            <label className="pomodoro-volume">
              <span>提示音量</span>
              <input type="range" min="0" max="100" value={Math.round(settings.volume * 100)}
                style={{ "--volume-progress": `${settings.volume * 100}%` } as CSSProperties}
                onChange={event => state.updateTimerSettings({ volume: Number(event.currentTarget.value) / 100 })} />
              <span>{Math.round(settings.volume * 100)}%</span>
            </label>
            <TimerSwitch label="桌面通知" icon="monitor" checked={settings.desktopNotifications}
              onChange={enabled => void toggleDesktop(enabled)} />
            {notificationFeedback && <p className="clock-feedback" aria-live="polite">{notificationFeedback}</p>}
            <div className="pomodoro-records">
              <div className="clock-record-today">
                <span className="clock-record-icon"><Icon name="star" /></span>
                <p>今日 <strong>{today.count}</strong> 顆星球 · <strong>{Number(today.minutes.toFixed(1))}</strong> 分鐘</p>
              </div>
              <p className="clock-record-total">累積專注 {Number(totalMinutes.toFixed(1))} 分鐘</p>
              <details>
                <summary>每日專注紀錄</summary>
                {days.size ? <ul>{[...days].sort(([a], [b]) => b.localeCompare(a)).map(([day, stats]) => (
                  <li key={day}><span>{day}</span><span>{stats.count} 顆星球 · {Number(stats.minutes.toFixed(1))} 分鐘</span></li>
                ))}</ul> : <p>完成第一段專注後，紀錄會出現在這裡</p>}
              </details>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
