// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import HistoryScreen from '../src/screens/HistoryScreen.tsx'
import { db } from '../src/db/db.ts'
import { getEntry, upsertEntry } from '../src/db/entries.ts'

afterEach(cleanup)

function renderHistory() {
  return render(
    <MemoryRouter>
      <HistoryScreen />
    </MemoryRouter>,
  )
}

async function seedThreeDays() {
  await upsertEntry('2026-07-10', { value: 176.2, unit: 'lb' })
  await upsertEntry('2026-07-11', { value: 175.8, unit: 'lb' })
  await upsertEntry('2026-07-12', { value: 175.4, unit: 'lb' })
}

async function openSheetFor(weightText: string) {
  const row = (await screen.findByText(weightText)).closest('button')!
  fireEvent.click(row)
  return screen.findByRole('dialog')
}

describe('HistoryScreen list', () => {
  it('shows an empty state linking to Log when there are no entries', async () => {
    renderHistory()
    await screen.findByText('No entries yet.')
    const link = screen.getByRole('link', { name: 'Log your first weigh-in' })
    expect(link.getAttribute('href')).toBe('/')
  })

  it('lists entries newest-first with weights in the display unit', async () => {
    await seedThreeDays()
    renderHistory()
    await screen.findByText('175.4 lb')
    const weights = screen
      .getAllByRole('listitem')
      .map((li) => li.querySelector('.history-weight')?.textContent)
    expect(weights).toEqual(['175.4 lb', '175.8 lb', '176.2 lb'])
  })

  it('live-updates when an entry is written after render (useLiveQuery round-trip)', async () => {
    await upsertEntry('2026-07-11', { value: 175.8, unit: 'lb' })
    renderHistory()
    await screen.findByText('175.8 lb')

    await upsertEntry('2026-07-12', { value: 175.4, unit: 'lb' })
    await screen.findByText('175.4 lb')
    const weights = screen
      .getAllByRole('listitem')
      .map((li) => li.querySelector('.history-weight')?.textContent)
    expect(weights).toEqual(['175.4 lb', '175.8 lb'])
  })

  it('labels only the entries whose day falls inside an initiative', async () => {
    await seedThreeDays()
    await db.initiatives.put({
      id: 'cut-1',
      name: 'Cut',
      startDate: '2026-07-11',
      endDate: '2026-07-12',
      goal: null,
      createdAt: 0,
      updatedAt: 0,
    })
    renderHistory()
    await screen.findByText('175.4 lb')
    await waitFor(() => expect(screen.getAllByText('Cut')).toHaveLength(2))
    const rowFor10 = screen.getByText('176.2 lb').closest('button')!
    expect(within(rowFor10).queryByText('Cut')).toBeNull()
  })
})

describe('HistoryScreen edit sheet', () => {
  it('opens prefilled on tap and overwrites on save', async () => {
    await seedThreeDays()
    renderHistory()

    const sheet = await openSheetFor('175.4 lb')
    const input = within(sheet).getByLabelText('Weight in pounds') as HTMLInputElement
    expect(input.value).toBe('175.4')

    fireEvent.change(input, { target: { value: '180.2' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save' }))

    await waitFor(async () => {
      const entry = await getEntry('2026-07-12')
      expect(entry?.entered).toEqual({ value: 180.2, unit: 'lb' })
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await screen.findByText('180.2 lb')
    expect(await db.entries.count()).toBe(3)
  })

  it('rejects invalid input inline without writing', async () => {
    await seedThreeDays()
    renderHistory()

    const sheet = await openSheetFor('175.4 lb')
    const input = within(sheet).getByLabelText('Weight in pounds')
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save' }))

    await within(sheet).findByRole('alert')
    expect((await getEntry('2026-07-12'))?.entered.value).toBe(175.4)
  })

  it('deletes after confirming, and the row disappears live', async () => {
    await seedThreeDays()
    renderHistory()

    const sheet = await openSheetFor('175.4 lb')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Delete' }))
    const confirm = await screen.findByRole('alertdialog')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('175.4 lb')).toBeNull())
    expect(await getEntry('2026-07-12')).toBeUndefined()
    expect(await db.entries.count()).toBe(2)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the entry when the delete confirm is cancelled', async () => {
    await seedThreeDays()
    renderHistory()

    const sheet = await openSheetFor('175.4 lb')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Delete' }))
    const confirm = await screen.findByRole('alertdialog')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(screen.getByRole('dialog')).toBeTruthy() // sheet still open
    expect((await getEntry('2026-07-12'))?.entered.value).toBe(175.4)
  })
})
