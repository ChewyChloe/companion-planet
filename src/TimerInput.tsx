import { useRef, useState } from "react";
import { formatTimerPart } from "./domain";

const asParts = (seconds: number): [string, string] => [
  formatTimerPart(Math.floor(seconds / 60)), formatTimerPart(seconds % 60),
];

export function TimerInput({ seconds, onChange }: {
  seconds: number;
  onChange: (milliseconds: number) => void;
}) {
  const [draft, setDraft] = useState<[string, string] | null>(null);
  const cancel = useRef(false);
  const parts = draft ?? asParts(seconds);

  return (
    <div className="time time-input" role="group" aria-label="計時時間"
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        if (draft && !cancel.current) {
          const duration = Number(parts[0]) * 60 + Math.min(59, Number(parts[1]));
          onChange(Math.max(1, duration) * 1000);
        }
        setDraft(null);
        cancel.current = false;
      }}
      onKeyDown={(event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        if (event.key === "Escape" || event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          cancel.current = event.key === "Escape";
          event.target.blur();
        }
      }}>
      {["分鐘", "秒鐘"].map((label, index) => (
        <span key={label} className="timer-part">
          {index === 1 && <span aria-hidden="true">:</span>}
          <input aria-label={label} inputMode="numeric" maxLength={2} value={parts[index]}
            onFocus={(event) => event.currentTarget.select()}
            onClick={(event) => event.currentTarget.select()}
            onChange={(event) => {
              const next: [string, string] = [...parts];
              next[index] = event.currentTarget.value.replace(/\D/g, "");
              setDraft(next);
            }} />
        </span>
      ))}
    </div>
  );
}
