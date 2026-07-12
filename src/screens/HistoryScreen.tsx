import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import EmptyState from '../components/EmptyState.tsx'
import WeightInput from '../components/WeightInput.tsx'
import { deleteEntry, listEntriesDesc, upsertEntry } from '../db/entries.ts'
import { initiativeForDay, list as listInitiatives } from '../db/initiatives.ts'
import { getSettings, updateSettings } from '../db/settings.ts'
import type { DayString, Entry, Unit } from '../db/types.ts'
import { formatDayLong } from '../lib/dates.ts'
import { displayWeight, parseWeightInput } from '../lib/units.ts'

export default function HistoryScreen() {
  const entries = useLiveQuery(listEntriesDesc, [])
  const initiatives = useLiveQuery(listInitiatives, [])
  const settings = useLiveQuery(getSettings, [])
  const unit: Unit = settings?.displayUnit ?? 'lb'
  const [editingDay, setEditingDay] = useState<DayString | null>(null)

  // Derived from the live list: a delete elsewhere closes the sheet naturally.
  const editingEntry = editingDay ? entries?.find((e) => e.date === editingDay) : undefined

  return (
    <main className="screen">
      <h1>History</h1>
      {entries?.length === 0 ? (
        <EmptyState
          message="No entries yet."
          actionLabel="Log your first weigh-in"
          actionTo="/"
        />
      ) : (
        <ul className="history-list">
          {(entries ?? []).map((entry) => {
            const initiative = initiativeForDay(initiatives ?? [], entry.date)
            return (
              <li key={entry.date}>
                <button
                  type="button"
                  className="history-row"
                  onClick={() => setEditingDay(entry.date)}
                >
                  <span className="history-date">{formatDayLong(entry.date)}</span>
                  {initiative && (
                    <span className="history-initiative">{initiative.name}</span>
                  )}
                  <span className="history-weight">
                    {displayWeight(entry, unit)} {unit}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {editingEntry && (
        <EditSheet
          key={editingEntry.date}
          entry={editingEntry}
          unit={unit}
          onClose={() => setEditingDay(null)}
        />
      )}
    </main>
  )
}

interface EditSheetProps {
  entry: Entry
  unit: Unit
  onClose: () => void
}

function EditSheet({ entry, unit, onClose }: EditSheetProps) {
  const [draft, setDraft] = useState(() => String(displayWeight(entry, unit)))
  // Same rule as LogScreen: unsaved typing survives a unit toggle; a pristine
  // prefill re-derives converted.
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string>()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (touched) return
    setDraft(String(displayWeight(entry, unit)))
  }, [entry, unit, touched])

  const toggleUnit = (next: Unit) => {
    if (next === unit) return
    void updateSettings({ displayUnit: next })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseWeightInput(draft, unit)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    void upsertEntry(entry.date, { value: parsed.value, unit }).then(onClose)
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit entry for ${formatDayLong(entry.date)}`}
        className="sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="sheet-title">{formatDayLong(entry.date)}</h2>
        <form className="sheet-form" onSubmit={handleSubmit}>
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
        </form>
        <div className="sheet-secondary">
          <button
            type="button"
            className="delete-button"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
          <button type="button" className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
        <ConfirmDialog
          open={confirmingDelete}
          title="Delete entry?"
          body={`This removes the entry for ${formatDayLong(entry.date)}.`}
          onConfirm={() => {
            void deleteEntry(entry.date).then(onClose)
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      </div>
    </div>
  )
}
