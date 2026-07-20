import InfoTip from './InfoTip.tsx'
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
    <div className="smoothing-toggle-row">
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
      <InfoTip label="About trend lines" title="Trend lines">
        <p>
          <strong>7d avg</strong> is the mean of your entries over the trailing 7 calendar days.
        </p>
        <p>
          <strong>EMA</strong> (exponential moving average) weights recent entries more heavily —
          it reacts faster to a new trend but is smoother than raw data.
        </p>
        <p>
          <strong>Off</strong> shows your raw logged weights with no smoothing.
        </p>
      </InfoTip>
    </div>
  )
}
