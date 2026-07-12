import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import EmptyState from '../components/EmptyState.tsx'
import RangeChips from '../components/RangeChips.tsx'
import StatCards from '../components/StatCards.tsx'
import TrendChart from '../components/TrendChart.tsx'
import { listEntriesAsc } from '../db/entries.ts'
import { getSettings } from '../db/settings.ts'
import type { Unit } from '../db/types.ts'
import { addDays, todayLocal } from '../lib/dates.ts'
import { RANGE_DAYS, type RangeKey } from '../lib/ranges.ts'
import { scopeStats } from '../lib/stats.ts'

export default function DashboardScreen() {
  const entries = useLiveQuery(listEntriesAsc, [])
  const settings = useLiveQuery(getSettings, [])
  const unit: Unit = settings?.displayUnit ?? 'lb'
  const [range, setRange] = useState<RangeKey>('90d')

  const scope = entries ?? []
  const days = RANGE_DAYS[range]
  const from = days === null ? null : addDays(todayLocal(), -(days - 1))
  const chartEntries = from === null ? scope : scope.filter((e) => e.date >= from)
  // Stats always cover the full scope; range chips clip the chart only.
  const stats = scopeStats(scope.map((e) => ({ date: e.date, kg: e.weightKg })))

  return (
    <main className="screen">
      <h1>Dashboard</h1>
      {entries?.length === 0 ? (
        <EmptyState
          message="No entries yet."
          actionLabel="Log your first weigh-in"
          actionTo="/"
        />
      ) : (
        <>
          <RangeChips value={range} onChange={setRange} />
          <TrendChart entries={chartEntries} unit={unit} />
          <StatCards stats={stats} unit={unit} />
        </>
      )}
    </main>
  )
}
