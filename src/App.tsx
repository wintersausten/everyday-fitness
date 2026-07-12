import { Routes, Route } from 'react-router'
import TabBar from './components/TabBar.tsx'
import LogScreen from './screens/LogScreen.tsx'
import DashboardScreen from './screens/DashboardScreen.tsx'
import HistoryScreen from './screens/HistoryScreen.tsx'
import SettingsScreen from './screens/SettingsScreen.tsx'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LogScreen />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <TabBar />
    </>
  )
}
