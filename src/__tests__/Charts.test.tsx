import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Charts } from '../pages/Charts'
import { useWeightStore } from '../store'

// Mock Recharts components
vi.mock('recharts', () => ({
  LineChart: vi.fn(({ children }) => <div data-testid="line-chart">{children}</div>),
  Line: vi.fn(() => <div data-testid="line" />),
  XAxis: vi.fn(() => <div data-testid="x-axis" />),
  YAxis: vi.fn(() => <div data-testid="y-axis" />),
  CartesianGrid: vi.fn(() => <div data-testid="cartesian-grid" />),
  Tooltip: vi.fn(() => <div data-testid="tooltip" />),
  ResponsiveContainer: vi.fn(({ children }) => <div data-testid="responsive-container">{children}</div>)
}))

// Mock the store
vi.mock('../store', () => ({
  useWeightStore: vi.fn()
}))

const mockStore = {
  entries: [],
  loading: false,
  loadEntries: vi.fn(),
  getRollingAverages: vi.fn(() => []),
  settings: { unit: 'kg', theme: 'light' }
}

describe('Charts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWeightStore).mockReturnValue(mockStore)
  })

  it('renders empty state when no entries', () => {
    render(
      <MemoryRouter>
        <Charts />
      </MemoryRouter>
    )
    
    expect(screen.getByText('No data to chart')).toBeInTheDocument()
    expect(screen.getByText('Start logging your weight to see beautiful charts of your progress.')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    vi.mocked(useWeightStore).mockReturnValue({
      ...mockStore,
      loading: true
    })
    
    render(
      <MemoryRouter>
        <Charts />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('renders charts when entries exist', () => {
    const mockEntries = [
      { id: 1, date: '2024-01-01', weight: 70.0, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, date: '2024-01-02', weight: 70.2, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, date: '2024-01-03', weight: 70.1, createdAt: new Date(), updatedAt: new Date() },
      { id: 4, date: '2024-01-04', weight: 70.3, createdAt: new Date(), updatedAt: new Date() },
      { id: 5, date: '2024-01-05', weight: 70.0, createdAt: new Date(), updatedAt: new Date() },
      { id: 6, date: '2024-01-06', weight: 70.2, createdAt: new Date(), updatedAt: new Date() },
      { id: 7, date: '2024-01-07', weight: 70.1, createdAt: new Date(), updatedAt: new Date() },
      { id: 8, date: '2024-01-08', weight: 70.4, createdAt: new Date(), updatedAt: new Date() }
    ]
    
    const mockAverages = [
      { date: '2024-01-07', average: 70.13 },
      { date: '2024-01-08', average: 70.16 }
    ]
    
    vi.mocked(useWeightStore).mockReturnValue({
      ...mockStore,
      entries: mockEntries,
      getRollingAverages: vi.fn(() => mockAverages)
    })
    
    render(
      <MemoryRouter>
        <Charts />
      </MemoryRouter>
    )
    
    expect(screen.getByText('Weight Trend')).toBeInTheDocument()
    expect(screen.getByText('7-Day Rolling Average')).toBeInTheDocument()
    expect(screen.getByText('Statistics')).toBeInTheDocument()
    expect(screen.getByText('Total Entries')).toBeInTheDocument()
  })

  it('renders chart controls', () => {
    const mockEntries = [
      { id: 1, date: '2024-01-01', weight: 70.0, createdAt: new Date(), updatedAt: new Date() }
    ]
    
    vi.mocked(useWeightStore).mockReturnValue({
      ...mockStore,
      entries: mockEntries
    })
    
    render(
      <MemoryRouter>
        <Charts />
      </MemoryRouter>
    )
    
    expect(screen.getByText('Time Range')).toBeInTheDocument()
    expect(screen.getByText('Chart Type')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3M' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Both' })).toBeInTheDocument()
  })

  it('displays correct statistics', () => {
    const mockEntries = [
      { id: 1, date: '2024-01-01', weight: 70.0, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, date: '2024-01-08', weight: 69.5, createdAt: new Date(), updatedAt: new Date() }
    ]
    
    vi.mocked(useWeightStore).mockReturnValue({
      ...mockStore,
      entries: mockEntries
    })
    
    render(
      <MemoryRouter>
        <Charts />
      </MemoryRouter>
    )
    
    // Find statistics by looking for the specific structure
    const statisticsSection = screen.getByText('Statistics').closest('div')
    expect(statisticsSection).toContainElement(screen.getByText('2'))
    expect(statisticsSection).toContainElement(screen.getByText('Total Entries'))
    expect(statisticsSection).toContainElement(screen.getByText('-0.5'))
  })

  it('handles insufficient data for rolling averages', () => {
    const mockEntries = [
      { id: 1, date: '2024-01-01', weight: 70.0, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, date: '2024-01-02', weight: 70.2, createdAt: new Date(), updatedAt: new Date() }
    ]
    
    vi.mocked(useWeightStore).mockReturnValue({
      ...mockStore,
      entries: mockEntries,
      getRollingAverages: vi.fn(() => [])
    })
    
    render(
      <MemoryRouter>
        <Charts />
      </MemoryRouter>
    )
    
    // Should show the rolling average chart title
    expect(screen.getByText('7-Day Rolling Average')).toBeInTheDocument()
    // Should show the "insufficient data" message
    expect(screen.getByText('No rolling average data available')).toBeInTheDocument()
    expect(screen.getByText('Add at least 7 weight entries to see trends')).toBeInTheDocument()
  })
})