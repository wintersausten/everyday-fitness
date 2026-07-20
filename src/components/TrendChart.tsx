import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

interface TooltipPayloadItem {
  dataKey: string
  value: number
}

/**
 * Small `--surface` card with a hairline border and tabular numbers (§7).
 * When smoothed, the trend value is the headline and the raw point is secondary.
 */
function ChartTooltip({
  active,
  label,
  payload,
  unit,
  smoothed,
}: {
  active?: boolean
  label?: number
  payload?: readonly TooltipPayloadItem[]
  unit: Unit
  smoothed: boolean
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null
  const by = (key: string) => payload.find((p) => p.dataKey === key)?.value
  const headline = smoothed ? by('trend') : by('raw')
  const raw = by('raw')

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{formatTick(label)}</div>
      {headline !== undefined && (
        <div className="chart-tooltip-value">
          {roundToDisplay(headline).toFixed(1)} {unit}
        </div>
      )}
      {smoothed && raw !== undefined && (
        <div className="chart-tooltip-raw">
          raw {roundToDisplay(raw).toFixed(1)} {unit}
        </div>
      )}
    </div>
  )
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
  // Draw the line in once on mount (§6), then switch off so a range/smoothing
  // change re-renders instantly instead of re-animating. Honors reduced-motion.
  const [animate, setAnimate] = useState(() => !prefersReducedMotion())
  useEffect(() => {
    if (!animate) return
    const id = setTimeout(() => setAnimate(false), 700)
    return () => clearTimeout(id)
  }, [animate])

  // Which chapter (initiative span) the hovered/selected point belongs to, so
  // its band can highlight — the tooltip alone doesn't tie a point back to a
  // chapter in All-data scope.
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)

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
  const chaptersWithSpan = (chapters ?? []).map((c) => ({
    ...c,
    tFrom: dayToLocalDate(c.from).getTime(),
    tTo: dayToLocalDate(c.to).getTime(),
  }))
  const visibleChapters = chaptersWithSpan.filter((c) => c.tFrom <= tMax && c.tTo >= tMin)

  return (
    <div className="chart-card">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
          onMouseMove={(state: { activeLabel?: number | string }) => {
            if (visibleChapters.length === 0) return
            const t = state.activeLabel === undefined ? NaN : Number(state.activeLabel)
            const match = visibleChapters.find((c) => t >= c.tFrom && t <= c.tTo)
            setActiveChapterId(match?.id ?? null)
          }}
          onMouseLeave={() => setActiveChapterId(null)}
        >
          {/* Minimal, muted grid (§7) — few lines, hairline color. */}
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          {visibleChapters.map((c, i) => {
            const isActive = c.id === activeChapterId
            return (
              <ReferenceArea
                key={c.id}
                x1={c.tFrom}
                x2={c.tTo}
                ifOverflow="hidden"
                fill="var(--accent)"
                fillOpacity={isActive ? 0.28 : i % 2 ? 0.12 : 0.06}
                stroke={isActive ? 'var(--accent)' : 'none'}
                strokeOpacity={isActive ? 0.6 : 0}
                label={{ value: c.name, position: 'insideTop', fontSize: 11, fill: 'var(--text-muted)' }}
              />
            )
          })}
          {/* Goal is a target, not a data series (§7): dashed line in --ink. */}
          {goal && (
            <ReferenceLine
              y={fromKg(goal.targetWeightKg, unit)}
              ifOverflow="extendDomain"
              stroke="var(--ink)"
              strokeDasharray="4 4"
            />
          )}
          {goal?.targetDate && showGoalDate && (
            <ReferenceLine
              x={dayToLocalDate(goal.targetDate).getTime()}
              ifOverflow="extendDomain"
              stroke="var(--ink)"
              strokeDasharray="4 4"
            />
          )}
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatTick}
            stroke="var(--border)"
            tick={{ fill: 'var(--text-muted)' }}
            tickLine={false}
            fontSize={12}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => String(roundToDisplay(v))}
            stroke="var(--border)"
            tick={{ fill: 'var(--text-muted)' }}
            tickLine={false}
            fontSize={12}
            width={44}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...(props as unknown as {
                  active?: boolean
                  label?: number
                  payload?: readonly TooltipPayloadItem[]
                })}
                unit={unit}
                smoothed={smoothed}
              />
            )}
            cursor={{ stroke: 'var(--border)' }}
          />
          {/* Raw series recedes: faint muted dots so the trend line reads primary (§7). */}
          <Line
            dataKey="raw"
            stroke={smoothed ? 'none' : 'var(--accent)'}
            strokeWidth={2}
            isAnimationActive={animate}
            animationDuration={600}
            animationEasing="ease-out"
            dot={{
              r: smoothed ? 3 : 3.5,
              fill: smoothed ? 'var(--text-muted)' : 'var(--accent)',
              fillOpacity: smoothed ? 0.3 : 1,
              stroke: 'none',
            }}
          />
          {smoothed && (
            <Line
              dataKey="trend"
              stroke="var(--accent)"
              strokeWidth={2}
              isAnimationActive={animate}
              animationDuration={600}
              animationEasing="ease-out"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
