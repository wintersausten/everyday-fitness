import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import DayPicker from '../components/DayPicker.tsx'
import WeightInput from '../components/WeightInput.tsx'
import { getEntry, upsertEntry } from '../db/entries.ts'
import { getSettings, updateSettings } from '../db/settings.ts'
import type { DayString, Unit } from '../db/types.ts'
import { todayLocal } from '../lib/dates.ts'
import { displayWeight, parseWeightInput } from '../lib/units.ts'

export default function LogScreen() {
  const [selectedDay, setSelectedDay] = useState<DayString>(todayLocal)
  const [draft, setDraft] = useState('')
  // True while the field holds unsaved typing; blocks prefill from clobbering it.
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const settings = useLiveQuery(getSettings, [])
  const unit: Unit = settings?.displayUnit ?? 'lb'
  const entry = useLiveQuery(() => getEntry(selectedDay), [selectedDay])

  useEffect(() => {
    if (touched) return
    setDraft(entry ? String(displayWeight(entry, unit)) : '')
  }, [entry, unit, touched])

  useEffect(() => () => clearTimeout(savedTimer.current), [])

  const changeDay = (day: DayString) => {
    setSelectedDay(day)
    setTouched(false)
    setError(undefined)
  }

  const toggleUnit = (next: Unit) => {
    if (next === unit) return
    // An unsaved draft keeps its digits — they're now declared in the new
    // unit. A prefilled value re-derives converted via the effect above.
    void updateSettings({ displayUnit: next })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseWeightInput(draft, unit)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    void upsertEntry(selectedDay, { value: parsed.value, unit }).then(() => {
      setError(undefined)
      setTouched(false)
      setSaved(true)
      clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(false), 1500)
    })
  }

  return (
    <main className="screen">
      <h1>Log</h1>
      <form className="log-form" onSubmit={handleSubmit}>
        <DayPicker day={selectedDay} onChange={changeDay} />
        <WeightInput
          value={draft}
          unit={unit}
          error={error}
          onChange={(value) => {
            setDraft(value)
            setTouched(true)
            setError(undefined)
          }}
          onToggleUnit={toggleUnit}
        />
        <button type="submit" className="save-button">
          Save
        </button>
        <p className={saved ? 'saved-flash visible' : 'saved-flash'} aria-live="polite">
          Saved ✓
        </p>
      </form>
    </main>
  )
}
