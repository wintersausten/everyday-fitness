import { useState, type FormEvent } from 'react'
import type { DayString, Initiative, Unit } from '../db/types.ts'
import { formatSpan, validateNoOverlap, type InitiativeInput } from '../db/initiatives.ts'
import { addDays, todayLocal } from '../lib/dates.ts'
import { displayWeight, parseWeightInput, toKg } from '../lib/units.ts'

interface InitiativeFormProps {
  /** Present when editing; absent when creating. */
  initial?: Initiative
  /** Full timeline, for overlap validation. */
  initiatives: Initiative[]
  unit: Unit
  onSave: (input: InitiativeInput) => void
  /**
   * Create-only escape hatch: the candidate overlaps only the ongoing
   * initiative and starts after it, so ending `current` on `endCurrentOn`
   * would make room. The caller owns the confirm prompt.
   */
  onEndCurrentAndSave?: (current: Initiative, endCurrentOn: DayString, input: InitiativeInput) => void
  /** Edit-only: shows the Delete button; the caller owns the confirm dialog. */
  onDelete?: () => void
  onCancel: () => void
}

export default function InitiativeForm({
  initial,
  initiatives,
  unit,
  onSave,
  onEndCurrentAndSave,
  onDelete,
  onCancel,
}: InitiativeFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [ongoing, setOngoing] = useState(initial ? initial.endDate === null : true)
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [goalWeight, setGoalWeight] = useState(() =>
    initial?.goal
      ? String(
          displayWeight(
            { weightKg: initial.goal.targetWeightKg, entered: initial.goal.targetEntered },
            unit,
          ),
        )
      : '',
  )
  const [goalDate, setGoalDate] = useState(initial?.goal?.targetDate ?? '')
  const [error, setError] = useState<string>()
  const today = todayLocal()
  const hasGoalWeight = goalWeight.trim() !== ''

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName === '') return setError('Enter a name')
    if (startDate === '') return setError('Pick a start date')
    // An ongoing initiative means "active now", so a start can't be in the
    // future — matches DayPicker capping weigh-ins at today.
    if (startDate > today) return setError('Start date can’t be in the future')
    if (!ongoing && endDate === '') return setError('Pick an end date or mark it ongoing')
    const end: DayString | null = ongoing ? null : endDate
    if (end !== null && end < startDate) return setError('End date must be on or after the start date')

    let goal: InitiativeInput['goal'] = null
    if (hasGoalWeight) {
      const parsed = parseWeightInput(goalWeight, unit)
      if (!parsed.ok) return setError(parsed.error)
      const entered = { value: parsed.value, unit }
      goal = {
        targetWeightKg: toKg(entered),
        targetEntered: entered,
        ...(goalDate !== '' ? { targetDate: goalDate } : {}),
      }
    }

    const input: InitiativeInput = { name: trimmedName, startDate, endDate: end, goal }
    const conflict = validateNoOverlap({ id: initial?.id, startDate, endDate: end }, initiatives)
    if (!conflict) return onSave(input)

    // Create-only: an ongoing conflict that starts earlier can be auto-ended
    // the day before — provided that resolves ALL conflicts.
    if (!initial && onEndCurrentAndSave && conflict.endDate === null && startDate > conflict.startDate) {
      const dayBefore = addDays(startDate, -1)
      const simulated = initiatives.map((i) =>
        i.id === conflict.id ? { ...i, endDate: dayBefore } : i,
      )
      if (!validateNoOverlap({ startDate, endDate: end }, simulated)) {
        return onEndCurrentAndSave(conflict, dayBefore, input)
      }
    }
    setError(`Overlaps ‘${conflict.name}’ (${formatSpan(conflict)})`)
  }

  return (
    <div className="sheet-overlay" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initial ? `Edit ${initial.name}` : 'New initiative'}
        className="sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="sheet-title">{initial ? 'Edit initiative' : 'New initiative'}</h2>
        <form className="initiative-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              placeholder="Cut 2026"
              onChange={(e) => {
                setName(e.target.value)
                setError(undefined)
              }}
            />
          </label>
          <label className="form-field">
            <span>Start date</span>
            {/* No HTML max=today: it would make a future value constraint-invalid
                and silently block submit. The form validates in JS so the future
                start surfaces as an inline error like every other field. */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setError(undefined)
              }}
            />
          </label>
          <label className="form-check">
            <input
              type="checkbox"
              checked={ongoing}
              onChange={(e) => {
                setOngoing(e.target.checked)
                setError(undefined)
              }}
            />
            <span>Ongoing</span>
          </label>
          {!ongoing && (
            <label className="form-field">
              <span>End date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setError(undefined)
                }}
              />
            </label>
          )}
          <fieldset className="goal-fieldset">
            <legend>Goal (optional)</legend>
            <label className="form-field">
              <span>Target weight ({unit})</span>
              <input
                type="text"
                inputMode="decimal"
                value={goalWeight}
                placeholder="—"
                onChange={(e) => {
                  setGoalWeight(e.target.value)
                  // A target date is meaningless without a weight; drop it when
                  // the weight is cleared so the disabled input isn't stale.
                  if (e.target.value.trim() === '') setGoalDate('')
                  setError(undefined)
                }}
              />
            </label>
            <label className="form-field">
              <span>Target date</span>
              <input
                type="date"
                value={goalDate}
                disabled={!hasGoalWeight}
                onChange={(e) => {
                  setGoalDate(e.target.value)
                  setError(undefined)
                }}
              />
            </label>
          </fieldset>
          {error && (
            <p className="input-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="save-button">
            Save
          </button>
        </form>
        <div className="sheet-secondary">
          {initial && onDelete ? (
            <button type="button" className="delete-button" onClick={onDelete}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
