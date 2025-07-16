import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { WeightChart } from '../components/WeightChart'
import { RollingAverageChart } from '../components/RollingAverageChart'
import { ChartControls } from '../components/ChartControls'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useWeightStore } from '../store'

export const Charts: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1w' | '1m' | '3m' | '6m' | '1y' | 'all'>('3m')
  const [chartType, setChartType] = useState<'weight' | 'average' | 'both'>('both')
  
  const { entries, loading, loadEntries, getRollingAverages } = useWeightStore()
  
  useEffect(() => {
    loadEntries()
  }, [loadEntries])
  
  const rollingAverages = getRollingAverages()
  
  if (loading && entries.length === 0) {
    return (
      <Layout title="Charts">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    )
  }
  
  if (entries.length === 0) {
    return (
      <Layout title="Charts">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No data to chart</h3>
          <p className="mt-2 text-sm text-gray-500">
            Start logging your weight to see beautiful charts of your progress.
          </p>
        </div>
      </Layout>
    )
  }
  
  return (
    <Layout title="Charts">
      <div className="content-section">
        <ChartControls
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          chartType={chartType}
          onChartTypeChange={setChartType}
        />
      </div>
      
      {(chartType === 'weight' || chartType === 'both') && (
        <div className="content-section">
          <div className="enhanced-card">
            <div className="card-header">
              <h2 className="card-title">Weight Trend</h2>
            </div>
            <WeightChart entries={entries} timeRange={timeRange} />
          </div>
        </div>
      )}
      
      {(chartType === 'average' || chartType === 'both') && (
        <div className="content-section">
          <div className="enhanced-card">
            <RollingAverageChart averages={rollingAverages} timeRange={timeRange} />
          </div>
        </div>
      )}
      
      {entries.length > 0 && (
        <div className="content-section">
          <div className="enhanced-card">
            <div className="card-header">
              <h3 className="card-title">Statistics</h3>
            </div>
            <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value text-blue-600">
                    {entries.length}
                  </div>
                  <div className="stat-label">Total Entries</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value text-green-600">
                    {rollingAverages.length}
                  </div>
                  <div className="stat-label">Rolling Averages</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value text-purple-600">
                    {(() => {
                      const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date))
                      const daysDiff = sortedEntries.length > 1 
                        ? Math.ceil((new Date(sortedEntries[sortedEntries.length - 1].date).getTime() - 
                                    new Date(sortedEntries[0].date).getTime()) / (1000 * 60 * 60 * 24))
                        : 0
                      return daysDiff
                    })()}
                  </div>
                  <div className="stat-label">Days Tracked</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-value text-orange-600">
                    {(() => {
                      if (entries.length < 2) return '0'
                      const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date))
                      const totalChange = sortedEntries[sortedEntries.length - 1].weight - sortedEntries[0].weight
                      return totalChange > 0 ? `+${totalChange.toFixed(1)}` : totalChange.toFixed(1)
                    })()}
                  </div>
                  <div className="stat-label">Total Change</div>
                </div>
              </div>
          </div>
        </div>
      )}
    </Layout>
  )
}