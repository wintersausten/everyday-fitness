import React from 'react'
import { Button } from './ui/Button'

interface ChartControlsProps {
  timeRange: '1w' | '1m' | '3m' | '6m' | '1y' | 'all'
  onTimeRangeChange: (range: '1w' | '1m' | '3m' | '6m' | '1y' | 'all') => void
  chartType: 'weight' | 'average' | 'both'
  onChartTypeChange: (type: 'weight' | 'average' | 'both') => void
}

const timeRangeOptions = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' }
] as const

const chartTypeOptions = [
  { value: 'weight', label: 'Weight' },
  { value: 'average', label: 'Average' },
  { value: 'both', label: 'Both' }
] as const

export const ChartControls: React.FC<ChartControlsProps> = ({
  timeRange,
  onTimeRangeChange,
  chartType,
  onChartTypeChange
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700">Time Range</label>
        <div className="flex flex-wrap gap-1">
          {timeRangeOptions.map(option => (
            <Button
              key={option.value}
              variant={timeRange === option.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onTimeRangeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700">Chart Type</label>
        <div className="flex flex-wrap gap-1">
          {chartTypeOptions.map(option => (
            <Button
              key={option.value}
              variant={chartType === option.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onChartTypeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}