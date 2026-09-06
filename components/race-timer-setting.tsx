'use client';

import { Clock3 } from 'lucide-react';

export function RaceTimerSetting({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (seconds: number | null) => void;
}) {
  return (
    <section className="race-timer-setting" aria-label="Race timer settings">
      <label>
        <input checked={value !== null} onChange={(event) => onChange(event.target.checked ? 15 : null)} type="checkbox" />
        <span className="timer-switch" aria-hidden="true" />
        <Clock3 size={17} aria-hidden="true" /> Timed questions
      </label>
      {value !== null && (
        <select aria-label="Time allowed for each question" onChange={(event) => onChange(Number(event.target.value))} value={value}>
          {[5, 10, 15, 20, 25, 30].map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds per question</option>)}
        </select>
      )}
    </section>
  );
}
