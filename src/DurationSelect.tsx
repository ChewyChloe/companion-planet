import { useEffect, useRef, useState } from "react";

const durations = [
  [25, "25 分鐘"], [45, "45 分鐘"], [5, "5 分鐘"],
  [1, "1 分鐘"], [1 / 6, "10 秒"],
] as const;

export function DurationSelect({value, disabled, onChange}: {
  value: number; disabled: boolean; onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const shown = open && !disabled;
  useEffect(() => {
    if (!shown) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", dismiss);
    return () => window.removeEventListener("pointerdown", dismiss);
  }, [shown]);
  return (
    <div className="duration-picker" ref={root} onKeyDown={event => {
      if (event.key === "Escape" && shown) {
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <label htmlFor="duration-trigger">專注時長</label>
      <button id="duration-trigger" ref={trigger} type="button" disabled={disabled}
        aria-expanded={shown} aria-controls="duration-choices" onClick={() => setOpen(!shown)}>
        {durations.find(([minutes]) => minutes === value)?.[1] ?? durations[0][1]}
        <span className="duration-chevron" aria-hidden="true" />
      </button>
      {shown && <div id="duration-choices" role="group" aria-label="時長選項">
        {durations.map(([minutes, label]) => (
          <button type="button" key={minutes} aria-pressed={value === minutes} onClick={() => {
            onChange(minutes);
            setOpen(false);
            trigger.current?.focus();
          }}>{label}</button>
        ))}
      </div>}
    </div>
  );
}
