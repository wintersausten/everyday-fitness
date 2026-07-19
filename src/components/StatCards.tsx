import type { Unit } from '../db/types.ts'
import type { ScopeStats } from '../lib/stats.ts'
import { fromKg, roundToDisplay } from '../lib/units.ts'

interface StatCardsProps {
  stats: ScopeStats
  unit: Unit
  /**
   * The user's goal direction for the current scope (DESIGN.md §5):
   * -1 = losing (target below start), +1 = gaining, 0 = no goal / indeterminate.
   * Drives whether a delta reads as toward-goal (accent) or away (muted).
   */
  goalDirection: number
}

function display(kg: number, unit: Unit): string {
  return roundToDisplay(fromKg(kg, unit)).toFixed(1)
}

/** Signed display value: "+0.4" / "-1.2" / "+0.0". */
function signed(kg: number, unit: Unit): string {
  const value = roundToDisplay(fromKg(kg, unit))
  return value < 0 ? value.toFixed(1) : `+${value.toFixed(1)}`
}

type Direction = 'toward' | 'away' | 'neutral'

/**
 * Semantic treatment for a weight-change delta (DESIGN.md §5). Direction is
 * shown with an arrow AND color, never color alone — and never a moral verdict:
 * toward the goal is the warm accent, away is neutral-muted, no goal is plain
 * direction-only. Red is never used here (it's destructive-only).
 */
function deltaMeta(kg: number, unit: Unit, goalDirection: number): { arrow: string; dir: Direction } {
  const value = roundToDisplay(fromKg(kg, unit))
  const sign = Math.sign(value)
  const arrow = sign > 0 ? '↑' : sign < 0 ? '↓' : ''
  if (sign === 0 || goalDirection === 0) return { arrow, dir: 'neutral' }
  return { arrow, dir: sign === goalDirection ? 'toward' : 'away' }
}

export default function StatCards({ stats, unit, goalDirection }: StatCardsProps) {
  const change = stats.totalChangeKg !== null ? deltaMeta(stats.totalChangeKg, unit, goalDirection) : null
  const rate = stats.ratePerWeekKg !== null ? deltaMeta(stats.ratePerWeekKg, unit, goalDirection) : null

  return (
    <div className="stat-cards">
      {stats.currentKg !== null && (
        <div className="stat-card">
          <span className="stat-label">Current</span>
          <span className="stat-value">
            {display(stats.currentKg, unit)} {unit}
          </span>
        </div>
      )}
      {stats.totalChangeKg !== null && change && (
        <div className="stat-card">
          <span className="stat-label">Change</span>
          <span className={`stat-value stat-value--${change.dir}`}>
            {change.arrow && (
              <span className="stat-delta" aria-hidden="true">
                {change.arrow}
              </span>
            )}
            <span>
              {signed(stats.totalChangeKg, unit)} {unit}
            </span>
          </span>
        </div>
      )}
      {stats.ratePerWeekKg !== null && rate && (
        <div className="stat-card">
          <span className="stat-label">Rate</span>
          <span className={`stat-value stat-value--${rate.dir}`}>
            {rate.arrow && (
              <span className="stat-delta" aria-hidden="true">
                {rate.arrow}
              </span>
            )}
            <span>
              {signed(stats.ratePerWeekKg, unit)} {unit}/wk
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
