import { useState } from "react";
import { formatTimerPart, normalizeFocusMinutes } from "./domain";

export function TimerInput({ minutes, onChange }: {
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const total = Math.round(minutes * 60);
  const [minuteText, setMinuteText] = useState(() => formatTimerPart(Math.floor(total / 60)));
  const [secondText, setSecondText] = useState(() => formatTimerPart(total % 60));
  return (
    <div
      className="time time-input"
      role="group"
      aria-label="專注時長"
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        const duration = normalizeFocusMinutes((Number(minuteText) * 60 + Number(secondText)) / 60);
        const seconds = Math.round(duration * 60);
        setMinuteText(formatTimerPart(Math.floor(seconds / 60)));
        setSecondText(formatTimerPart(seconds % 60));
        onChange(duration);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement)
          event.target.blur();
      }}
    >
      <input aria-label="分鐘" inputMode="numeric" maxLength={2} value={minuteText}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setMinuteText(event.currentTarget.value.replace(/\D/g, ""))} />
      <span aria-hidden="true">:</span>
      <input aria-label="秒鐘" inputMode="numeric" maxLength={2} value={secondText}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setSecondText(event.currentTarget.value.replace(/\D/g, ""))} />
    </div>
  );
}
