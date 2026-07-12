import type { DayString } from '../db/types.ts'
import { addDays, todayLocal } from '../lib/dates.ts'

interface DayPickerProps {
  day: DayString
  onChange: (day: DayString) => void
}

export default function DayPicker({ day, onChange }: DayPickerProps) {
  const today = todayLocal()
  return (
    <div className="day-picker">
      <button
        type="button"
        className="day-step"
        aria-label="Previous day"
        onClick={() => onChange(addDays(day, -1))}
      >
        ‹
      </button>
      <input
        type="date"
        className="day-field"
        aria-label="Date"
        value={day}
        max={today}
        onChange={(e) => {
          const next = e.target.value
          if (!next) return // ignore cleared/partial input
          // Not every browser enforces max on typed input — clamp to today.
          onChange(next > today ? today : next)
        }}
      />
      <button
        type="button"
        className="day-step"
        aria-label="Next day"
        disabled={day >= today}
        onClick={() => onChange(addDays(day, 1))}
      >
        ›
      </button>
    </div>
  )
}
