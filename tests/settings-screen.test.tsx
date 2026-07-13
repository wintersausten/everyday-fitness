// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import SettingsScreen from '../src/screens/SettingsScreen.tsx'
import { db } from '../src/db/db.ts'
import { upsertEntry } from '../src/db/entries.ts'
import { create } from '../src/db/initiatives.ts'
import { getSettings } from '../src/db/settings.ts'
import { addDays, formatDayLong, todayLocal } from '../src/lib/dates.ts'
import { KG_PER_LB } from '../src/lib/units.ts'

afterEach(cleanup)

async function openNewInitiativeForm() {
  render(<SettingsScreen />)
  fireEvent.click(await screen.findByRole('button', { name: 'New initiative' }))
  return screen.getByRole('dialog', { name: 'New initiative' })
}

function fillForm(fields: { name?: string; start?: string; end?: string; ongoing?: boolean }) {
  if (fields.name !== undefined) {
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: fields.name } })
  }
  if (fields.start !== undefined) {
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: fields.start } })
  }
  if (fields.ongoing !== undefined) {
    const checkbox = screen.getByLabelText('Ongoing') as HTMLInputElement
    if (checkbox.checked !== fields.ongoing) fireEvent.click(checkbox)
  }
  if (fields.end !== undefined) {
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: fields.end } })
  }
}

describe('SettingsScreen', () => {
  it('persists the display unit via the radio group', async () => {
    render(<SettingsScreen />)
    const kg = await screen.findByLabelText('Kilograms (kg)')
    fireEvent.click(kg)
    await screen.findByRole('radio', { name: 'Kilograms (kg)', checked: true })
    expect((await getSettings()).displayUnit).toBe('kg')
  })

  it('creates an ongoing initiative through the form', async () => {
    await openNewInitiativeForm()
    fillForm({ name: 'Cut 2026', start: '2026-01-05' }) // ongoing is the default
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('Cut 2026')
    screen.getByText('2026-01-05 → ongoing')
    const stored = await db.initiatives.toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ name: 'Cut 2026', startDate: '2026-01-05', endDate: null })
  })

  it('round-trips a goal in the display unit', async () => {
    await openNewInitiativeForm()
    fillForm({ name: 'Cut', start: '2026-01-05' })
    fireEvent.change(screen.getByLabelText('Target weight (lb)'), { target: { value: '170' } })
    fireEvent.change(screen.getByLabelText('Target date'), { target: { value: '2026-10-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('Cut')
    const [stored] = await db.initiatives.toArray()
    expect(stored.goal).toEqual({
      targetWeightKg: 170 * KG_PER_LB,
      targetEntered: { value: 170, unit: 'lb' },
      targetDate: '2026-10-01',
    })

    // Reopen the edit sheet: the entered value comes back verbatim.
    fireEvent.click(screen.getByText('Cut'))
    expect((screen.getByLabelText('Target weight (lb)') as HTMLInputElement).value).toBe('170')
  })

  it('rejects a future start date and writes nothing', async () => {
    await openNewInitiativeForm()
    fillForm({ name: 'Later', start: addDays(todayLocal(), 30) })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Start date can’t be in the future')
    expect(await db.initiatives.count()).toBe(0)
  })

  it('disables the goal target date until a weight is entered', async () => {
    await openNewInitiativeForm()
    const targetDate = screen.getByLabelText('Target date') as HTMLInputElement
    expect(targetDate.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Target weight (lb)'), { target: { value: '170' } })
    expect(targetDate.disabled).toBe(false)

    // Clearing the weight disables it again and drops any date already set.
    fireEvent.change(targetDate, { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Target weight (lb)'), { target: { value: '' } })
    expect(targetDate.disabled).toBe(true)
    expect(targetDate.value).toBe('')
  })

  it('rejects a shared-boundary overlap with a named inline error', async () => {
    await create({ name: 'Spring cut', startDate: '2026-03-01', endDate: '2026-05-31', goal: null })
    await openNewInitiativeForm()
    // Starts on Spring cut's last day — inclusive ranges share 2026-05-31.
    fillForm({ name: 'Bulk', start: '2026-05-31', ongoing: false, end: '2026-08-31' })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Overlaps ‘Spring cut’ (2026-03-01 → 2026-05-31)')
    expect(await db.initiatives.count()).toBe(1)
  })

  it('offers to end the ongoing initiative the day before the new start', async () => {
    await create({ name: 'Cut 2026', startDate: '2026-01-05', endDate: null, goal: null })
    await openNewInitiativeForm()
    fillForm({ name: 'Bulk', start: '2026-07-01' })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('alertdialog', {
      name: `End ‘Cut 2026’ on ${formatDayLong('2026-06-30')}?`,
    })
    fireEvent.click(screen.getByRole('button', { name: 'End & create' }))

    await screen.findByText('2026-07-01 → ongoing')
    const byName = Object.fromEntries((await db.initiatives.toArray()).map((i) => [i.name, i]))
    expect(byName['Cut 2026'].endDate).toBe('2026-06-30')
    expect(byName['Bulk'].endDate).toBeNull()
  })

  it('cancelling the end-current prompt writes nothing and keeps the form open', async () => {
    await create({ name: 'Cut 2026', startDate: '2026-01-05', endDate: null, goal: null })
    await openNewInitiativeForm()
    fillForm({ name: 'Bulk', start: '2026-07-01' })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const prompt = await screen.findByRole('alertdialog')
    fireEvent.click(within(prompt).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    screen.getByRole('dialog', { name: 'New initiative' }) // form still open
    expect(await db.initiatives.count()).toBe(1)
    expect((await db.initiatives.toArray())[0].endDate).toBeNull()
  })

  it('deletes an initiative after a confirm that promises entries survive', async () => {
    await upsertEntry('2026-03-10', { value: 180, unit: 'lb' })
    await create({ name: 'Cut', startDate: '2026-03-01', endDate: '2026-05-31', goal: null })
    render(<SettingsScreen />)

    fireEvent.click(await screen.findByText('Cut'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete ‘Cut’?' })
    expect(dialog.textContent).toContain('Your entries are not deleted.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('Cut')).toBeNull())
    expect(await db.initiatives.count()).toBe(0)
    expect(await db.entries.count()).toBe(1)
  })
})
