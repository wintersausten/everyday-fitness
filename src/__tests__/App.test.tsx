import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { Log } from '../pages/Log'
import { Charts } from '../pages/Charts'
import { Settings } from '../pages/Settings'

// Create a test component without the outer Router
const AppRoutes = () => (
  <ErrorBoundary>
    <Routes>
      <Route path="/" element={<Log />} />
      <Route path="/charts" element={<Charts />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  </ErrorBoundary>
)

describe('App', () => {
  it('renders Log page by default', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    )
    expect(screen.getByText('Log Weight')).toBeInTheDocument()
    expect(screen.getByText('Add Entry')).toBeInTheDocument()
  })

  it('renders Charts page when navigating to /charts', () => {
    render(
      <MemoryRouter initialEntries={['/charts']}>
        <AppRoutes />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: 'Charts' })).toBeInTheDocument()
  })

  it('renders Settings page when navigating to /settings', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppRoutes />
      </MemoryRouter>
    )
    expect(screen.getByText('Unit Preferences')).toBeInTheDocument()
  })

  it('renders navigation with correct links', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    )
    
    expect(screen.getByText('Log')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Charts/i })).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })
})