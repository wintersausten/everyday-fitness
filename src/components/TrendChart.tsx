import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import type { DayString, Entry, Goal, SmoothingMode, Unit } from '../db/types.ts'
import { dayToLocalDate } from '../lib/dates.ts'
import type { StatPoint } from '../lib/stats.ts'
import { fromKg, roundToDisplay } from '../lib/units.ts'

/** An initiative's span, for All-data chapter shading. */
export interface Chapter {
  id: string
  name: string
  from: DayString
  to: DayString // endDate ?? today — resolved by the caller
}

interface TrendChartProps {
  /** Entries to plot, ascending by date, already clipped to the chart range. */
  entries: Entry[]
  /** Trend series matching `entries` one-to-one by date (smoothed over the full scope, then clipped). */
  trend: StatPoint[]
  smoothing: SmoothingMode
  unit: Unit
  /** Scoped initiative's goal; never passed in All-data scope. */
  goal?: Goal | null
  /** Show the vertical target-date line (full-span range only — it extends the x-domain). */
  showGoalDate?: boolean
  /** Initiative spans to shade — All-data scope only. */
  chapters?: Chapter[]
}

function formatTick(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function TrendChart({
  entries,
  trend,
  smoothing,
  unit,
  goal,
  showGoalDate,
  chapters,
}: TrendChartProps) {
  if (entries.length === 0) {
    return <div className="chart-card chart-empty">No entries in this range.</div>
  }

  const smoothed = smoothing !== 'off'
  const data = entries.map((entry, i) => ({
    t: dayToLocalDate(entry.date).getTime(),
    raw: fromKg(entry.weightKg, unit),
    trend: fromKg(trend[i].kg, unit),
  }))

  // Skip chapters entirely outside the plotted span; ifOverflow="hidden"
  // clips partially-outside bands to the chart area.
  const tMin = data[0].t
  const tMax = data[data.length - 1].t
  const visibleChapters = (chapters ?? []).filter(
    (c) => dayToLocalDate(c.from).getTime() <= tMax && dayToLocalDate(c.to).getTime() >= tMin,
  )

  return (
    <div className="chart-card">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          {visibleChapters.map((c, i) => (
            <ReferenceArea
              key={c.id}
              x1={dayToLocalDate(c.from).getTime()}
              x2={dayToLocalDate(c.to).getTime()}
              ifOverflow="hidden"
              fill="var(--accent)"
              fillOpacity={i % 2 ? 0.14 : 0.07}
              stroke="none"
              label={{ value: c.name, position: 'insideTop', fontSize: 11, fill: 'var(--text)' }}
            />
          ))}
          {goal && (
            <ReferenceLine
              y={fromKg(goal.targetWeightKg, unit)}
              ifOverflow="extendDomain"
              stroke="var(--accent)"
              strokeDasharray="4 4"
            />
          )}
          {goal?.targetDate && showGoalDate && (
            <ReferenceLine
              x={dayToLocalDate(goal.targetDate).getTime()}
              ifOverflow="extendDomain"
              stroke="var(--accent)"
              strokeDasharray="4 4"
            />
          )}
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatTick}
            stroke="var(--text)"
            tickLine={false}
            fontSize={12}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => String(roundToDisplay(v))}
            stroke="var(--text)"
            tickLine={false}
            fontSize={12}
            width={44}
          />
          <Line
            dataKey="raw"
            stroke={smoothed ? 'none' : 'var(--accent)'}
            strokeWidth={2}
            isAnimationActive={false}
            dot={{
              r: 3.5,
              fill: 'var(--accent)',
              fillOpacity: smoothed ? 0.35 : 1,
              stroke: 'none',
            }}
          />
          {smoothed && (
            <Line
              dataKey="trend"
              stroke="var(--accent)"
              strokeWidth={2}
              isAnimationActive={false}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
