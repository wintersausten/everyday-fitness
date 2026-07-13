import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import EmptyState from '../components/EmptyState.tsx'
import InitiativeSwitcher from '../components/InitiativeSwitcher.tsx'
import RangeChips from '../components/RangeChips.tsx'
import SmoothingToggle from '../components/SmoothingToggle.tsx'
import StatCards from '../components/StatCards.tsx'
import TrendChart, { type Chapter } from '../components/TrendChart.tsx'
import { entriesInRange, listEntriesAsc } from '../db/entries.ts'
import { list as listInitiatives } from '../db/initiatives.ts'
import { getSettings, updateSettings } from '../db/settings.ts'
import type { SmoothingMode, Unit } from '../db/types.ts'
import { addDays, todayLocal } from '../lib/dates.ts'
import { RANGE_DAYS, type RangeKey } from '../lib/ranges.ts'
import { smooth } from '../lib/smoothing.ts'
import { scopeStats } from '../lib/stats.ts'

export default function DashboardScreen() {
  const initiatives = useLiveQuery(listInitiatives, [])
  const settings = useLiveQuery(getSettings, [])
  const unit: Unit = settings?.displayUnit ?? 'lb'
  const smoothing: SmoothingMode = settings?.smoothing ?? 'ma7'

  // null = user hasn't chosen yet → derive the default (ongoing initiative if
  // one exists, else All data). A choice pointing at a deleted initiative
  // falls back to the derived default the same way.
  const [scopeSel, setScopeSel] = useState<string | null>(null)
  // null = default range for the scope: initiative → full span, All data → 90d.
  const [rangeSel, setRangeSel] = useState<RangeKey | null>(null)

  const chosen =
    scopeSel !== null && (scopeSel === 'all' || initiatives?.some((i) => i.id === scopeSel))
      ? scopeSel
      : null
  const active = initiatives?.find((i) => i.endDate === null)
  const scopeId = chosen ?? active?.id ?? 'all'
  const scoped = scopeId === 'all' ? undefined : initiatives?.find((i) => i.id === scopeId)

  // Membership is derived from date ranges — entries never store an
  // initiativeId, so scoping is just a keyrange query.
  const entries = useLiveQuery(
    () =>
      scoped
        ? entriesInRange(scoped.startDate, scoped.endDate ?? todayLocal())
        : listEntriesAsc(),
    [scoped?.id, scoped?.startDate, scoped?.endDate],
  )

  const scope = entries ?? []
  // Trend over the full scope, so range-clipped points keep their pre-range
  // smoothing window; stats also always cover the full scope.
  const trend = smooth(
    scope.map((e) => ({ date: e.date, kg: e.weightKg })),
    smoothing,
  )
  const stats = scopeStats(trend)

  const range = rangeSel ?? (scoped ? 'all' : '90d')
  const days = RANGE_DAYS[range]
  // Trailing windows anchor at the scope's last day, so 30d inside an ended
  // initiative means its final 30 days, not the last 30 calendar days.
  const anchor = scoped?.endDate ?? todayLocal()
  const from = days === null ? null : addDays(anchor, -(days - 1))
  const chartEntries = from === null ? scope : scope.filter((e) => e.date >= from)
  const chartTrend = from === null ? trend : trend.filter((p) => p.date >= from)

  const chapters: Chapter[] =
    scopeId === 'all'
      ? (initiatives ?? []).map((i) => ({
          id: i.id,
          name: i.name,
          from: i.startDate,
          to: i.endDate ?? todayLocal(),
        }))
      : []

  return (
    <main className="screen">
      <h1>Dashboard</h1>
      {initiatives && initiatives.length > 0 && (
        <InitiativeSwitcher
          initiatives={initiatives}
          value={scopeId}
          onChange={(next) => {
            setScopeSel(next)
            setRangeSel(null)
          }}
        />
      )}
      {entries?.length === 0 ? (
        <EmptyState
          message="No entries yet."
          actionLabel="Log your first weigh-in"
          actionTo="/"
        />
      ) : (
        <>
          <RangeChips value={range} onChange={setRangeSel} />
          <TrendChart
            entries={chartEntries}
            trend={chartTrend}
            smoothing={smoothing}
            unit={unit}
            goal={scoped?.goal ?? null}
            showGoalDate={days === null}
            chapters={chapters}
          />
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
