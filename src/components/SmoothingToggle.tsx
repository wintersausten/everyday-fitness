import type { SmoothingMode } from '../db/types.ts'

const MODES: { key: SmoothingMode; label: string }[] = [
  { key: 'ma7', label: '7d avg' },
  { key: 'ema', label: 'EMA' },
  { key: 'off', label: 'Off' },
]

interface SmoothingToggleProps {
  value: SmoothingMode
  onChange: (next: SmoothingMode) => void
}

export default function SmoothingToggle({ value, onChange }: SmoothingToggleProps) {
  return (
    <div className="range-chips" role="group" aria-label="Smoothing">
      {MODES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={key === value ? 'range-chip active' : 'range-chip'}
          aria-pressed={key === value}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
