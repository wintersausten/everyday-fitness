import type { RefObject } from 'react'
import type { Unit } from '../db/types.ts'

interface WeightInputProps {
  value: string
  unit: Unit
  error?: string
  /** Handle on the field itself, so the screen can put the caret there. */
  inputRef?: RefObject<HTMLInputElement | null>
  onChange: (value: string) => void
  onToggleUnit: (unit: Unit) => void
}

const UNITS: Unit[] = ['lb', 'kg']

export default function WeightInput({
  value,
  unit,
  error,
  inputRef,
  onChange,
  onToggleUnit,
}: WeightInputProps) {
  return (
    <div className="weight-input">
      <div className="weight-input-row">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          className="weight-field"
          value={value}
          placeholder="0.0"
          aria-label={`Weight in ${unit === 'lb' ? 'pounds' : 'kilograms'}`}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="unit-toggle" role="group" aria-label="Unit">
          {UNITS.map((u) => (
            <button
              key={u}
              type="button"
              className={u === unit ? 'unit-option active' : 'unit-option'}
              aria-pressed={u === unit}
              onClick={() => onToggleUnit(u)}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p className="input-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
