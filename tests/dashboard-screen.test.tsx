// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import DashboardScreen from '../src/screens/DashboardScreen.tsx'
import { upsertEntry } from '../src/db/entries.ts'
import { updateSettings } from '../src/db/settings.ts'
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

  it('renders current, change, and rate in the display unit', async () => {
    await seedRecentWeek()
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
    renderDashboard()
    await screen.findByText('175.4 lb')
    await updateSettings({ displayUnit: 'kg' })
    await screen.findByText('79.6 kg')
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
