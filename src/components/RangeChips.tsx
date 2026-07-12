import type { RangeKey } from '../lib/ranges.ts'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '1y', label: '1y' },
  { key: 'all', label: 'All' },
]

interface RangeChipsProps {
  value: RangeKey
  onChange: (next: RangeKey) => void
}

export default function RangeChips({ value, onChange }: RangeChipsProps) {
  return (
    <div className="range-chips" role="group" aria-label="Chart range">
      {RANGES.map(({ key, label }) => (
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
