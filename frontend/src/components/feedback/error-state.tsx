import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/shared/utils/cn'

interface ErrorStateProps extends ComponentProps<'section'> {
  title?: string
  description?: string
  retryLabel?: string
  onRetry?: () => void
}

function ErrorState({
  title = 'Could not load data',
  description = 'Check the connection and try again.',
  retryLabel = 'Retry',
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <section
      role="alert"
      className={cn(
        'flex min-h-48 flex-col items-center justify-center gap-2.5 rounded-xl border border-[#e5b9ad] bg-[#fbeeea] p-5 text-center',
        className,
      )}
      {...props}
    >
      <span
        className="flex size-10 items-center justify-center rounded-full bg-status-danger-bg text-lg font-semibold text-status-danger-fg"
        aria-hidden="true"
      >
        !
      </span>
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      <p className="max-w-sm text-[13px] leading-5 text-muted-foreground">
        {description}
      </p>
      {onRetry ? (
        <Button type="button" size="sm" className="mt-2" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </section>
  )
}

export { ErrorState }
export type { ErrorStateProps }
