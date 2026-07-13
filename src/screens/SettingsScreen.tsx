import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import InitiativeForm from '../components/InitiativeForm.tsx'
import SmoothingToggle from '../components/SmoothingToggle.tsx'
import {
  create,
  endCurrentAndCreate,
  formatSpan,
  list as listInitiatives,
  remove,
  update,
  type InitiativeInput,
} from '../db/initiatives.ts'
import { getSettings, updateSettings } from '../db/settings.ts'
import type { DayString, Initiative, Unit } from '../db/types.ts'
import { formatDayLong } from '../lib/dates.ts'
import { displayWeight } from '../lib/units.ts'

const UNITS: { key: Unit; label: string }[] = [
  { key: 'lb', label: 'Pounds (lb)' },
  { key: 'kg', label: 'Kilograms (kg)' },
]

/** The end-current prompt, pending the user's confirmation. */
interface PendingEnd {
  current: Initiative
  endOn: DayString
  input: InitiativeInput
}

export default function SettingsScreen() {
  const settings = useLiveQuery(getSettings, [])
  const initiatives = useLiveQuery(listInitiatives, [])
  const unit: Unit = settings?.displayUnit ?? 'lb'

  // 'new' opens an empty form; an Initiative opens it prefilled for editing.
  const [editing, setEditing] = useState<'new' | Initiative | null>(null)
  const [deleting, setDeleting] = useState<Initiative | null>(null)
  const [pendingEnd, setPendingEnd] = useState<PendingEnd | null>(null)

  const closeForm = () => {
    setEditing(null)
    setPendingEnd(null)
  }

  return (
    <main className="screen">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2 className="settings-heading">Units</h2>
        <div className="unit-radios" role="radiogroup" aria-label="Display unit">
          {UNITS.map(({ key, label }) => (
            <label key={key} className="form-check">
              <input
                type="radio"
                name="displayUnit"
                checked={unit === key}
                onChange={() => void updateSettings({ displayUnit: key })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-heading">Smoothing</h2>
        <SmoothingToggle
          value={settings?.smoothing ?? 'ma7'}
          onChange={(next) => void updateSettings({ smoothing: next })}
        />
      </section>

      <section className="settings-section">
        <h2 className="settings-heading">Initiatives</h2>
        {initiatives?.length === 0 && (
          <p className="settings-hint">
            Group weigh-ins into named periods — a cut, a bulk — and set an optional goal.
          </p>
        )}
        <ul className="initiative-list">
          {(initiatives ?? []).map((i) => (
            <li key={i.id}>
              <button type="button" className="history-row" onClick={() => setEditing(i)}>
                <span className="initiative-name">{i.name}</span>
                <span className="initiative-span">{formatSpan(i)}</span>
                {i.goal && (
                  <span className="initiative-goal">
                    →{' '}
                    {displayWeight(
                      { weightKg: i.goal.targetWeightKg, entered: i.goal.targetEntered },
                      unit,
                    )}{' '}
                    {unit}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="add-button" onClick={() => setEditing('new')}>
          New initiative
        </button>
      </section>

      {editing !== null && (
        <InitiativeForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          initiatives={initiatives ?? []}
          unit={unit}
          onSave={(input) => {
            const write =
              editing === 'new' ? create(input) : update(editing.id, input)
            void write.then(closeForm)
          }}
          onEndCurrentAndSave={(current, endOn, input) =>
            setPendingEnd({ current, endOn, input })
          }
          onDelete={editing === 'new' ? undefined : () => setDeleting(editing)}
          onCancel={closeForm}
        />
      )}

      <ConfirmDialog
        open={pendingEnd !== null}
        title={pendingEnd ? `End ‘${pendingEnd.current.name}’ on ${formatDayLong(pendingEnd.endOn)}?` : ''}
        body="Only one initiative can be ongoing. Ending it makes room for the new one."
        confirmLabel="End & create"
        onConfirm={() => {
          if (!pendingEnd) return
          void endCurrentAndCreate(pendingEnd.current.id, pendingEnd.endOn, pendingEnd.input).then(
            closeForm,
          )
        }}
        onCancel={() => setPendingEnd(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `Delete ‘${deleting.name}’?` : ''}
        body="Your entries are not deleted."
        onConfirm={() => {
          if (!deleting) return
          void remove(deleting.id).then(() => {
            setDeleting(null)
            closeForm()
          })
        }}
        onCancel={() => setDeleting(null)}
      />
    </main>
  )
}
