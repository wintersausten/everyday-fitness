import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastContainer } from './components/Toast'
import { useToast } from './hooks/useToast'
import { useTheme } from './hooks/useTheme'
import { useWeightStore } from './store'
import { Log } from './pages/Log'
import { Charts } from './pages/Charts'
import { Settings } from './pages/Settings'
import './index.css'
import './styles/globals.css'
import './App.css'

function App() {
  const toast = useToast()
  const { loadSettings } = useWeightStore()
  
  // Load settings on app start
  useEffect(() => {
    loadSettings()
  }, [loadSettings])
  
  // Apply theme
  useTheme()
  
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Log />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <ToastContainer messages={toast.messages} onDismiss={toast.dismissToast} />
      </Router>
    </ErrorBoundary>
  )
}

export default App