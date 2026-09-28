import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { CloseIcon } from '@/components/ui/icons'
import { cn } from '@/shared/utils/cn'

interface AlertProps {
  tone: 'success' | 'danger'
  children: ReactNode
  onDismiss: () => void
}

/** Dismissible banner for the outcome of a save, above the form it belongs to. */
function Alert({ tone, children, onDismiss }: AlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm',
        tone === 'success'
          ? 'border-status-success-border bg-status-success-bg text-status-success-fg'
          : 'border-status-danger-border bg-status-danger-bg text-status-danger-fg',
      )}
    >
      <span>{children}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Dismiss message"
        className="text-current hover:bg-black/5"
        onClick={onDismiss}
      >
        <CloseIcon />
      </Button>
    </div>
  )
}

export { Alert }
