import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { Entry, SmoothingMode, Unit } from '../db/types.ts'
import { dayToLocalDate } from '../lib/dates.ts'
import type { StatPoint } from '../lib/stats.ts'
import { fromKg, roundToDisplay } from '../lib/units.ts'

interface TrendChartProps {
  /** Entries to plot, ascending by date, already clipped to the chart range. */
  entries: Entry[]
  /** Trend series matching `entries` one-to-one by date (smoothed over the full scope, then clipped). */
  trend: StatPoint[]
  smoothing: SmoothingMode
  unit: Unit
}

function formatTick(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function TrendChart({ entries, trend, smoothing, unit }: TrendChartProps) {
  if (entries.length === 0) {
    return <div className="chart-card chart-empty">No entries in this range.</div>
  }

  const smoothed = smoothing !== 'off'
  const data = entries.map((entry, i) => ({
    t: dayToLocalDate(entry.date).getTime(),
    raw: fromKg(entry.weightKg, unit),
    trend: fromKg(trend[i].kg, unit),
  }))

  return (
    <div className="chart-card">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
