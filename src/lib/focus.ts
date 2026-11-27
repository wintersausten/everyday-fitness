/**
 * Mobile browsers only raise the virtual keyboard when focus() runs during a
 * user gesture. A focus on page load has no gesture behind it, so the field
 * lights up with no keyboard — worse than leaving it alone. This tracks recent
 * gestures so a load-time focus can tell the two arrivals apart: cold load
 * (skip) versus a tab tap that navigated here (focus, keyboard opens).
 */

let lastGestureAt = -Infinity

/** How long after a tap a focus() still counts as gesture-driven. */
const GESTURE_WINDOW_MS = 1000

if (typeof window !== 'undefined') {
  const mark = () => {
    lastGestureAt = Date.now()
  }
  // Capture, so a handler calling stopPropagation can't hide the gesture.
  window.addEventListener('pointerdown', mark, { capture: true })
  window.addEventListener('keydown', mark, { capture: true })
}

/** True when focusing a text field now would actually leave it typeable. */
export function shouldAutoFocus(): boolean {
  // Fine pointer means a physical keyboard — nothing has to pop up. No
  // matchMedia at all (jsdom) is treated the same way: focus, don't crash.
  if (!window.matchMedia?.('(pointer: coarse)').matches) return true
  return Date.now() - lastGestureAt < GESTURE_WINDOW_MS
}
