import { Link } from 'react-router'

interface EmptyStateProps {
  message: string
  actionLabel?: string
  actionTo?: string
}

export default function EmptyState({ message, actionLabel, actionTo }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {actionLabel && actionTo && (
        <Link className="empty-state-action" to={actionTo}>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
