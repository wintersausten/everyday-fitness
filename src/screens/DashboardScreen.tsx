import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import EmptyState from '../components/EmptyState.tsx'
import RangeChips from '../components/RangeChips.tsx'
import SmoothingToggle from '../components/SmoothingToggle.tsx'
import StatCards from '../components/StatCards.tsx'
import TrendChart from '../components/TrendChart.tsx'
import { listEntriesAsc } from '../db/entries.ts'
import { getSettings, updateSettings } from '../db/settings.ts'
import type { SmoothingMode, Unit } from '../db/types.ts'
import { addDays, todayLocal } from '../lib/dates.ts'
import { RANGE_DAYS, type RangeKey } from '../lib/ranges.ts'
import { smooth } from '../lib/smoothing.ts'
import { scopeStats } from '../lib/stats.ts'

export default function DashboardScreen() {
  const entries = useLiveQuery(listEntriesAsc, [])
  const settings = useLiveQuery(getSettings, [])
  const unit: Unit = settings?.displayUnit ?? 'lb'
  const smoothing: SmoothingMode = settings?.smoothing ?? 'ma7'
  const [range, setRange] = useState<RangeKey>('90d')

  const scope = entries ?? []
  // Trend over the full scope, so range-clipped points keep their pre-range
  // smoothing window; stats also always cover the full scope.
  const trend = smooth(
    scope.map((e) => ({ date: e.date, kg: e.weightKg })),
    smoothing,
  )
  const stats = scopeStats(trend)

  const days = RANGE_DAYS[range]
  const from = days === null ? null : addDays(todayLocal(), -(days - 1))
  const chartEntries = from === null ? scope : scope.filter((e) => e.date >= from)
  const chartTrend = from === null ? trend : trend.filter((p) => p.date >= from)

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
          <TrendChart entries={chartEntries} trend={chartTrend} smoothing={smoothing} unit={unit} />
          <SmoothingToggle
            value={smoothing}
            onChange={(next) => void updateSettings({ smoothing: next })}
          />
          <StatCards stats={stats} unit={unit} />
        </>
      )}
    </main>
  )
}
