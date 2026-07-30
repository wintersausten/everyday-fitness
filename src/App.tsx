import { useState } from 'react'
import { Routes, Route } from 'react-router'
import AboutDialog from './components/AboutDialog.tsx'
import TabBar from './components/TabBar.tsx'
import LogScreen from './screens/LogScreen.tsx'
import DashboardScreen from './screens/DashboardScreen.tsx'
import HistoryScreen from './screens/HistoryScreen.tsx'
import SettingsScreen from './screens/SettingsScreen.tsx'
import { hasSeenWelcome, markWelcomeSeen } from './lib/welcome.ts'

export default function App() {
  const [showWelcome, setShowWelcome] = useState(() => !hasSeenWelcome())

  return (
    <>
      <Routes>
        <Route path="/" element={<LogScreen autoFocus={!showWelcome} />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <TabBar />
      <AboutDialog
        open={showWelcome}
        onClose={() => {
          markWelcomeSeen()
          setShowWelcome(false)
        }}
      />
    </>
  )
}
