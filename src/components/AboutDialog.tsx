interface AboutDialogProps {
  open: boolean
  onClose: () => void
}

/** What the app is, shown once on first launch and revisitable from Settings. */
export default function AboutDialog({ open, onClose }: AboutDialogProps) {
  if (!open) return null
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="About Everyday Fitness"
        className="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">Everyday Fitness</h2>
        <div className="dialog-body">
          <p>Log your weight every day and watch your trend move toward your goal.</p>
          <p>
            All your data stays on this device, stored right in your browser. Nothing is ever
            sent anywhere — no accounts, no servers.
          </p>
        </div>
        <div className="dialog-actions">
          <button type="button" className="dialog-ok" onClick={onClose} autoFocus>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
