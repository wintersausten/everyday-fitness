import { NavLink } from 'react-router'

const tabs = [
  { to: '/', label: 'Log' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
]

export default function TabBar() {
  return (
    <nav className="tab-bar">
      {tabs.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
