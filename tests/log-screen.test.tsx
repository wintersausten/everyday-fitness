// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import LogScreen from '../src/screens/LogScreen.tsx'

afterEach(cleanup)

const weightField = () => screen.getByLabelText('Weight in pounds')

describe('LogScreen focus', () => {
  it('focuses the weight field on open', async () => {
    render(<LogScreen />)
    await waitFor(() => expect(document.activeElement).toBe(weightField()))
  })

  it('leaves focus alone while the welcome modal owns it, then claims it', async () => {
    const { rerender } = render(<LogScreen autoFocus={false} />)
    expect(document.activeElement).not.toBe(weightField())

    rerender(<LogScreen autoFocus />)
    await waitFor(() => expect(document.activeElement).toBe(weightField()))
  })
})
