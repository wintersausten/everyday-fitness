import type { Initiative } from '../db/types.ts'

interface InitiativeSwitcherProps {
  /** Timeline order (list()); "All data" is always first. */
  initiatives: Initiative[]
  /** 'all' or an initiative id. */
  value: string
  onChange: (next: string) => void
}

export default function InitiativeSwitcher({ initiatives, value, onChange }: InitiativeSwitcherProps) {
  return (
    <select
      className="scope-select"
      aria-label="Scope"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="all">All data</option>
      {initiatives.map((i) => (
        <option key={i.id} value={i.id}>
          {i.name}
        </option>
      ))}
    </select>
  )
}
