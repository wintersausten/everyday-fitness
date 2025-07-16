import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeightEntryForm } from '../components/WeightEntryForm'
import { useWeightStore } from '../store'

// Mock the store
vi.mock('../store', () => ({
  useWeightStore: vi.fn()
}))

const mockStore = {
  addEntry: vi.fn(),
  updateEntry: vi.fn(),
  entries: [],
  loading: false,
  settings: { unit: 'kg', theme: 'light' }
}

describe('WeightEntryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWeightStore).mockReturnValue(mockStore)
  })

  it('renders form fields correctly', () => {
    render(<WeightEntryForm />)
    
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Weight (kg)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Entry' })).toBeInTheDocument()
  })

  it('shows correct unit in weight label', () => {
    vi.mocked(useWeightStore).mockReturnValue({
      ...mockStore,
      settings: { unit: 'lb', theme: 'light' }
    })
    
    render(<WeightEntryForm />)
    expect(screen.getByLabelText('Weight (lb)')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<WeightEntryForm />)
    
    const submitButton = screen.getByRole('button', { name: 'Add Entry' })
    await user.click(submitButton)
    
    expect(await screen.findByText('Weight is required')).toBeInTheDocument()
    expect(mockStore.addEntry).not.toHaveBeenCalled()
  })

  it('validates weight input', async () => {
    const user = userEvent.setup()
    render(<WeightEntryForm />)
    
    const weightInput = screen.getByLabelText('Weight (kg)')
    const submitButton = screen.getByRole('button', { name: 'Add Entry' })
    
    await user.type(weightInput, '-5')
    await user.click(submitButton)
    
    expect(await screen.findByText('Please enter a valid weight (greater than 0)')).toBeInTheDocument()
    expect(mockStore.addEntry).not.toHaveBeenCalled()
  })

  it('submits valid form data', async () => {
    const user = userEvent.setup()
    render(<WeightEntryForm />)
    
    const weightInput = screen.getByLabelText('Weight (kg)')
    const submitButton = screen.getByRole('button', { name: 'Add Entry' })
    
    await user.type(weightInput, '70.5')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockStore.addEntry).toHaveBeenCalledWith({
        date: expect.any(String),
        weight: 70.5
      })
    })
  })

  it('shows update mode for existing entry', () => {
    const existingEntry = {
      id: 1,
      date: '2024-01-01',
      weight: 70.0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    vi.mocked(useWeightStore).mockReturnValue({
      ...mockStore,
      entries: [existingEntry]
    })
    
    render(<WeightEntryForm />)
    
    const dateInput = screen.getByLabelText('Date') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
    
    expect(screen.getByText(/Current entry for 2024-01-01/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update Entry' })).toBeInTheDocument()
  })

  it('calls updateEntry for existing date', async () => {
    const user = userEvent.setup()
    const existingEntry = {
      id: 1,
      date: '2024-01-01',
      weight: 70.0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    vi.mocked(useWeightStore).mockReturnValue({
      ...mockStore,
      entries: [existingEntry]
    })
    
    render(<WeightEntryForm />)
    
    const dateInput = screen.getByLabelText('Date')
    const weightInput = screen.getByLabelText('Weight (kg)')
    
    await user.clear(dateInput)
    await user.type(dateInput, '2024-01-01')
    await user.type(weightInput, '71.5')
    
    // Use findBy to wait for the button text to change
    const submitButton = await screen.findByRole('button', { name: 'Update Entry' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockStore.updateEntry).toHaveBeenCalledWith(1, { weight: 71.5 })
    })
  })

  it('shows loading state', () => {
    vi.mocked(useWeightStore).mockReturnValue({
      ...mockStore,
      loading: true
    })
    
    render(<WeightEntryForm />)
    
    const submitButton = screen.getByRole('button', { name: 'Add Entry' })
    expect(submitButton).toBeDisabled()
  })
})