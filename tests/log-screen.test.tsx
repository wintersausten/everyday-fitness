// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import LogScreen from '../src/screens/LogScreen.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const weightField = () => screen.getByLabelText('Weight in pounds')

/** Pretend this is a phone: coarse pointer, so focus needs a gesture behind it. */
function useCoarsePointer() {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({ matches: query === '(pointer: coarse)' }) as MediaQueryList,
  )
}

function tap() {
  window.dispatchEvent(new Event('pointerdown'))
}

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

  it('skips the focus on a phone cold load, where no keyboard would open', () => {
    useCoarsePointer()
    render(<LogScreen />)
    // Highlighting a field the keyboard won't follow is worse than nothing.
    expect(document.activeElement).not.toBe(weightField())
  })

  it('focuses on a phone when a tap brought us here, so the keyboard opens', async () => {
    useCoarsePointer()
    tap() // the tab-bar tap that navigated to Log
    render(<LogScreen />)
    await waitFor(() => expect(document.activeElement).toBe(weightField()))
  })
})
