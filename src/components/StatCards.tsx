import type { Unit } from '../db/types.ts'
import type { ScopeStats } from '../lib/stats.ts'
import { fromKg, roundToDisplay } from '../lib/units.ts'

interface StatCardsProps {
  stats: ScopeStats
  unit: Unit
}

function display(kg: number, unit: Unit): string {
  return roundToDisplay(fromKg(kg, unit)).toFixed(1)
}

/** Signed display value: "+0.4" / "-1.2" / "+0.0". */
function signed(kg: number, unit: Unit): string {
  const value = roundToDisplay(fromKg(kg, unit))
  return value < 0 ? value.toFixed(1) : `+${value.toFixed(1)}`
}

export default function StatCards({ stats, unit }: StatCardsProps) {
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
      {stats.totalChangeKg !== null && (
        <div className="stat-card">
          <span className="stat-label">Change</span>
          <span className="stat-value">
            {signed(stats.totalChangeKg, unit)} {unit}
          </span>
        </div>
      )}
      {stats.ratePerWeekKg !== null && (
        <div className="stat-card">
          <span className="stat-label">Rate</span>
          <span className="stat-value">
            {signed(stats.ratePerWeekKg, unit)} {unit}/wk
          </span>
        </div>
      )}
    </div>
  )
}
