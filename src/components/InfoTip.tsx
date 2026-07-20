import { useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface InfoTipProps {
  label: string
  title: string
  children: ReactNode
}

/**
 * Small "?" trigger that opens a dismissible info dialog. Self-contained — drop
 * anywhere. The dialog is portaled to <body> so it never inherits styling
 * (e.g. uppercase overline labels) from wherever the trigger is embedded.
 */
export default function InfoTip({ label, title, children }: InfoTipProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="info-trigger" aria-label={label} onClick={() => setOpen(true)}>
        ?
      </button>
      {open &&
        createPortal(
          <div className="dialog-overlay" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="dialog-title">{title}</h2>
              <div className="dialog-body">{children}</div>
              <div className="dialog-actions">
                <button type="button" className="dialog-ok" onClick={() => setOpen(false)} autoFocus>
                  Got it
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
