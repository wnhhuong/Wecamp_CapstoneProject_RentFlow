import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

interface EmptyStateProps extends ComponentProps<'section'> {
  title?: string
  description?: string
  action?: ReactNode
}

function EmptyState({
  title = 'Nothing here yet',
  description = 'There is no information to display.',
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        'flex min-h-48 flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-input bg-page p-5 text-center',
        className,
      )}
      {...props}
    >
      <span
        className="flex size-10 items-center justify-center rounded-full bg-status-info-bg text-lg font-semibold text-status-info-fg"
        aria-hidden="true"
      >
        ○
      </span>
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      <p className="max-w-sm text-[13px] leading-5 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  )
}

export { EmptyState }
export type { EmptyStateProps }
