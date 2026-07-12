interface ConfirmDialogProps {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Simple confirm variant. Slice 8 adds the typed-confirmation variant here.
 * Plain overlay instead of <dialog>.showModal() so jsdom can exercise it.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">{title}</h2>
        {body && <p className="dialog-body">{body}</p>}
        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button type="button" className="dialog-confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
