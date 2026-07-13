// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import DashboardScreen from '../src/screens/DashboardScreen.tsx'
import { upsertEntry } from '../src/db/entries.ts'
import { create } from '../src/db/initiatives.ts'
import { getSettings, updateSettings } from '../src/db/settings.ts'
import { addDays, todayLocal } from '../src/lib/dates.ts'

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

afterEach(cleanup)

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardScreen />
    </MemoryRouter>,
  )
}

/** Today 175.4, yesterday 175.8, a week ago 176.2 (all lb). */
async function seedRecentWeek() {
  const today = todayLocal()
  await upsertEntry(addDays(today, -7), { value: 176.2, unit: 'lb' })
  await upsertEntry(addDays(today, -1), { value: 175.8, unit: 'lb' })
  await upsertEntry(today, { value: 175.4, unit: 'lb' })
}

describe('DashboardScreen', () => {
  it('shows an empty state linking to Log when there are no entries', async () => {
    renderDashboard()
    await screen.findByText('No entries yet.')
    const link = screen.getByRole('link', { name: 'Log your first weigh-in' })
    expect(link.getAttribute('href')).toBe('/')
  })

  it('defaults to the 90d range chip', async () => {
    await seedRecentWeek()
    renderDashboard()
    const chip = await screen.findByRole('button', { name: '90d' })
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('renders raw current, change, and rate when smoothing is off', async () => {
    await seedRecentWeek()
    await updateSettings({ smoothing: 'off' })
    renderDashboard()
    await screen.findByText('175.4 lb')
    // 175.4 − 176.2 over the full scope.
    screen.getByText('-0.8 lb')
    // Hand-computed OLS over x = 0, 6, 7 / y = 176.2, 175.8, 175.4 (lb):
    // slope = −2.8 / (258/9) kg-per-day → ×7 ≈ −0.6837 → −0.7 displayed.
    screen.getByText('-0.7 lb/wk')
  })

  it('hides the rate card below 2 entries but keeps current and change', async () => {
    await upsertEntry(todayLocal(), { value: 175.4, unit: 'lb' })
    renderDashboard()
    await screen.findByText('175.4 lb')
    screen.getByText('+0.0 lb')
    expect(screen.queryByText('Rate')).toBeNull()
  })

  it('re-renders stats when the display unit changes (live query)', async () => {
    await seedRecentWeek()
    await updateSettings({ smoothing: 'off' })
    renderDashboard()
    await screen.findByText('175.4 lb')
    await updateSettings({ displayUnit: 'kg' })
    await screen.findByText('79.6 kg')
  })

  it('defaults to the 7d avg smoothing chip', async () => {
    await seedRecentWeek()
    renderDashboard()
    const chip = await screen.findByRole('button', { name: '7d avg' })
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Off' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('computes stats over the ma7 trend and switches to raw on Off, persisting the mode', async () => {
    await seedRecentWeek()
    renderDashboard()
    // Today's 7-calendar-day window holds only yesterday and today (the entry
    // 7 days back is outside): (175.8 + 175.4) / 2 = 175.6. That entry's own
    // window holds only itself, so the first trend value stays 176.2.
    await screen.findByText('175.6 lb')
    screen.getByText('-0.6 lb')
    // OLS over trend x = 0, 6, 7 / y = 176.2, 176.0, 175.6:
    // slope = −1.9333/28.6667 per day → ×7 ≈ −0.472 → −0.5 displayed.
    screen.getByText('-0.5 lb/wk')

    fireEvent.click(screen.getByRole('button', { name: 'Off' }))
    await screen.findByText('175.4 lb') // raw latest entry
    screen.getByText('-0.8 lb')
    expect((await getSettings()).smoothing).toBe('off')
  })

  it('defaults to the ongoing initiative scope and derives membership from dates', async () => {
    const today = todayLocal()
    await updateSettings({ smoothing: 'off' })
    await upsertEntry(addDays(today, -40), { value: 180, unit: 'lb' }) // before the initiative
    await upsertEntry(addDays(today, -1), { value: 176, unit: 'lb' })
    await upsertEntry(today, { value: 175, unit: 'lb' })
    const cut = await create({ name: 'Cut', startDate: addDays(today, -5), endDate: null, goal: null })

    renderDashboard()
    const select = (await screen.findByRole('combobox', { name: 'Scope' })) as HTMLSelectElement
    expect(select.value).toBe(cut.id)
    // Scope holds only the last two entries: change = 175 − 176.
    await screen.findByText('-1.0 lb')
    // Initiative scope defaults to the full-span chip.
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')

    // Switching to All data brings the old entry back in and resets to 90d.
    fireEvent.change(select, { target: { value: 'all' } })
    await screen.findByText('-5.0 lb')
    expect(screen.getByRole('button', { name: '90d' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('anchors trailing ranges at an ended initiative’s last day, not today', async () => {
    const today = todayLocal()
    await upsertEntry(addDays(today, -61), { value: 180, unit: 'lb' })
    const old = await create({
      name: 'Old cut',
      startDate: addDays(today, -65),
      endDate: addDays(today, -60),
      goal: null,
    })

    renderDashboard()
    const select = (await screen.findByRole('combobox', { name: 'Scope' })) as HTMLSelectElement
    fireEvent.change(select, { target: { value: old.id } })
    await screen.findByText('180.0 lb')

    // 30 days back from the scope end still covers the entry; anchoring at
    // today would leave this range empty.
    fireEvent.click(screen.getByRole('button', { name: '30d' }))
    expect(screen.queryByText('No entries in this range.')).toBeNull()
  })

  it('range chips clip the chart but never the stats', async () => {
    // One entry 40 days back: inside 90d, outside 30d.
    await upsertEntry(addDays(todayLocal(), -40), { value: 180, unit: 'lb' })
    renderDashboard()
    await screen.findByText('180.0 lb') // current — always full scope
    expect(screen.queryByText('No entries in this range.')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '30d' }))
    await screen.findByText('No entries in this range.')
    screen.getByText('180.0 lb') // stats unaffected by the range
  })
})
