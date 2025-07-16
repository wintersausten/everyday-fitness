import React, { useEffect } from 'react'
import { useWeightStore } from '../store'
import { EntryItem } from './EntryItem'
import { LoadingSpinner } from './ui/LoadingSpinner'

export const RecentEntriesList: React.FC = () => {
  const { entries, loading, loadEntries, getRollingAverages } = useWeightStore()
  
  useEffect(() => {
    loadEntries()
  }, [loadEntries])
  
  const rollingAverages = getRollingAverages()
  const recentEntries = entries.slice(0, 14) // Show last 14 entries
  
  if (loading && entries.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No entries yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Get started by adding your first weight entry above.
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            Recent Entries
          </h3>
          <p className="text-sm text-gray-500">
            Your latest weight tracking data
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {entries.length}
          </div>
          <div className="text-xs text-gray-500">
            total entries
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {recentEntries.map((entry) => {
          // Find corresponding rolling average for this entry
          const rollingAverage = rollingAverages.find(avg => avg.date === entry.date)
          
          return (
            <div key={entry.id} className="entry-container">
              <EntryItem
                entry={entry}
                showAverage={!!rollingAverage}
                averageValue={rollingAverage?.average}
              />
            </div>
          )
        })}
      </div>
      
      {entries.length > 14 && (
        <div className="text-center pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            <svg className="w-3 h-3 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Showing {recentEntries.length} of {entries.length} entries
          </div>
        </div>
      )}
    </div>
  )
}