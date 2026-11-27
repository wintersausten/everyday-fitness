import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import DayPicker from '../components/DayPicker.tsx'
import ScaleScanner from '../components/ScaleScanner.tsx'
import WeightInput from '../components/WeightInput.tsx'
import { getEntry, latestEntryOnOrBefore, upsertEntry } from '../db/entries.ts'
import { getSettings, updateSettings } from '../db/settings.ts'
import type { DayString, Unit } from '../db/types.ts'
import { formatDayLong, todayLocal } from '../lib/dates.ts'
import { displayWeight, parseWeightInput } from '../lib/units.ts'

export default function LogScreen() {
  const [selectedDay, setSelectedDay] = useState<DayString>(todayLocal)
  const [draft, setDraft] = useState('')
  // True while the field holds unsaved typing; blocks prefill from clobbering it.
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState(false)
  const [scanning, setScanning] = useState(false)

  const settings = useLiveQuery(getSettings, [])
  const unit: Unit = settings?.displayUnit ?? 'lb'
  // null = loaded and absent; undefined = still loading (the auto-open below
  // must not mistake one for the other).
  const entry = useLiveQuery(async () => (await getEntry(selectedDay)) ?? null, [selectedDay])
  const latest = useLiveQuery(() => latestEntryOnOrBefore(selectedDay), [selectedDay])
  const expected = latest ? displayWeight(latest, unit) : undefined

  // Scan mode: open the camera on arrival when today isn't logged yet. Once
  // per visit to this screen — closing the scanner sticks.
  const autoOpened = useRef(false)
  useEffect(() => {
    if (autoOpened.current || settings === undefined || entry === undefined) return
    autoOpened.current = true
    if (settings.entryMode === 'scan' && entry === null && selectedDay === todayLocal()) {
      setScanning(true)
    }
  }, [settings, entry, selectedDay])

  useEffect(() => {
    if (touched) return
    setDraft(entry ? String(displayWeight(entry, unit)) : '')
  }, [entry, unit, touched])

  const changeDay = (day: DayString) => {
    setSelectedDay(day)
    setTouched(false)
    setError(undefined)
    setSaved(false)
  }

  const toggleUnit = (next: Unit) => {
    if (next === unit) return
    // An unsaved draft keeps its digits — they're now declared in the new
    // unit. A prefilled value re-derives converted via the effect above.
    void updateSettings({ displayUnit: next })
  }

  const save = (raw: string) => {
    const parsed = parseWeightInput(raw, unit)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    // Drop to false first so a resubmit while `saved` is already true still
    // restarts the celebration — the browser commits this render before the
    // async write resolves, so the CSS animations replay from scratch.
    setSaved(false)
    void upsertEntry(selectedDay, { value: parsed.value, unit }).then(() => {
      setError(undefined)
      setTouched(false)
      setSaved(true)
    })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    save(draft)
  }

  const fillFromScan = (value: number) => {
    setDraft(String(value))
    setTouched(true)
    setError(undefined)
    setSaved(false)
    setScanning(false)
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
        <button type="button" className="scan-button" onClick={() => setScanning(true)}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 12h8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Scan scale
        </button>
        <button type="submit" className={saved ? 'save-button celebrate' : 'save-button'}>
          Save
        </button>
        <p className={saved ? 'saved-flash visible' : 'saved-flash'} aria-live="polite">
          <span className="saved-check">
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Saved
        </p>
      </form>
      {scanning && (
        <ScaleScanner
          unit={unit}
          expected={expected}
          dayLabel={formatDayLong(selectedDay)}
          onSave={(value) => {
            fillFromScan(value)
            save(String(value))
          }}
          onEdit={fillFromScan}
          onClose={() => setScanning(false)}
        />
      )}
    </main>
  )
}
