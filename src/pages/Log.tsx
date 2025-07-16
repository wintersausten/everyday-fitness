import React, { useEffect } from 'react'
import { Layout } from '../components/Layout'
import { WeightEntryForm } from '../components/WeightEntryForm'
import { RecentEntriesList } from '../components/RecentEntriesList'
import { ToastContainer } from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { useWeightStore } from '../store'

export const Log: React.FC = () => {
  const { error, clearError, loadSettings } = useWeightStore()
  const toast = useToast()
  
  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])
  
  // Show error toasts
  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, toast, clearError])
  
  return (
    <Layout title="Log Weight">
      <div className="content-section">
        {/* Quick Entry Card */}
        <div className="quick-entry-card">
          <div className="card-header">
            <div>
              <h2 className="text-xl font-bold text-white">Quick Entry</h2>
              <p className="text-sm" style={{color: '#bfdbfe'}}>Track your weight progress</p>
            </div>
            <div className="entry-icon">
              <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <div className="entry-form-container">
            <WeightEntryForm />
          </div>
        </div>
      </div>
      
      <div className="content-section">
        {/* Recent Entries Card */}
        <div className="enhanced-card">
          <RecentEntriesList />
        </div>
      </div>
      
      <ToastContainer messages={toast.messages} onDismiss={toast.dismissToast} />
    </Layout>
  )
}