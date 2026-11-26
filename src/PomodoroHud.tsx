import { useState } from "react";
import { dailyFocus, formatTimerPart, localDay } from "./domain";
import { Icon } from "./Icon";
import { useWorld } from "./store";
import { TimerInput } from "./TimerInput";

type Command = "start" | "pause" | "reset" | "skip";
const durationFields = [
  ["focusMinutes", "專注（分鐘）"],
  ["shortMinutes", "短休息（分鐘）"],
  ["longMinutes", "長休息（分鐘）"],
  ["longEvery", "幾輪後長休息"],
] as const;

export function PomodoroHud({ onCommand, previewSound }: {
  onCommand: (command: Command) => void;
  previewSound: () => void;
}) {
  const state = useWorld();
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    <section className="focus-hud" aria-label="番茄鐘">
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
        <button className="round-control timer-settings-toggle control-tooltip"
          aria-label="番茄鐘設定與紀錄" aria-expanded={settingsOpen} data-tooltip="番茄鐘設定與紀錄"
          onClick={() => setSettingsOpen(open => !open)}><Icon name="sliders" /></button>
      </div>
      {settingsOpen && (
        <section className="pomodoro-settings" aria-label="計時設定與紀錄">
          <div className="pomodoro-heading">
            <h2>番茄鐘設定</h2>
            <button type="button" onClick={() => { onCommand("skip"); setSettingsOpen(false); }}>跳過階段</button>
          </div>
          <div className="pomodoro-durations">
            {durationFields.map(([key, name]) => (
              <label key={key}>{name}
                <input key={settings[key]} type="number" min={key === "longEvery" ? 1 : .02}
                  max={key === "longEvery" ? 12 : 99.98} step={key === "longEvery" ? 1 : "any"}
                  defaultValue={Number(settings[key].toFixed(2))}
                  inputMode={key === "longEvery" ? "numeric" : "decimal"}
                  onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }}
                  onBlur={event => {
                    const value = event.currentTarget.valueAsNumber;
                    if (Number.isFinite(value) && value > 0 && value !== Number(settings[key].toFixed(2)))
                      state.updateTimerSettings({ [key]: value });
                    else event.currentTarget.value = String(Number(settings[key].toFixed(2)));
                  }} />
              </label>
            ))}
          </div>
          <label className="pomodoro-check"><input type="checkbox" checked={settings.autoStart}
            onChange={event => state.updateTimerSettings({ autoStart: event.currentTarget.checked })} />自動開始下一階段</label>
          <div className="pomodoro-sound">
            <label className="pomodoro-check"><input type="checkbox" checked={settings.sound}
              onChange={event => state.updateTimerSettings({ sound: event.currentTarget.checked })} />提示音</label>
            <button type="button" onClick={previewSound}>試聽</button>
          </div>
          <label className="pomodoro-volume">提示音音量
            <input type="range" min="0" max="100" value={Math.round(settings.volume * 100)}
              onChange={event => state.updateTimerSettings({ volume: Number(event.currentTarget.value) / 100 })} />
          </label>
          <label className="pomodoro-check"><input type="checkbox" checked={settings.desktopNotifications}
            onChange={event => void toggleDesktop(event.currentTarget.checked)} />桌面通知</label>
          {notificationFeedback && <p aria-live="polite">{notificationFeedback}</p>}
          <div className="pomodoro-records">
            <p>今日 {today.count} 顆番茄 · {Number(today.minutes.toFixed(1))} 分鐘</p>
            <details>
              <summary>每日專注紀錄</summary>
              {days.size ? <ul>{[...days].sort(([a], [b]) => b.localeCompare(a)).map(([day, stats]) => (
                <li key={day}><span>{day}</span><span>{stats.count} 顆 · {Number(stats.minutes.toFixed(1))} 分鐘</span></li>
              ))}</ul> : <p>完成第一段專注後，紀錄會出現在這裡</p>}
            </details>
          </div>
        </section>
      )}
    </section>
  );
}
