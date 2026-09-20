import type { ComponentProps } from 'react'

import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/shared/utils/cn'

interface PageLoadingProps extends ComponentProps<'section'> {
  title?: string
  description?: string
}

function PageLoading({
  title = 'Loading',
  description = 'Fetching the latest information…',
  className,
  ...props
}: PageLoadingProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-hairline bg-page p-5 text-center',
        className,
      )}
      {...props}
    >
      <Spinner className="size-9 text-brand" aria-hidden="true" />
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  )
}

export { PageLoading }
export type { PageLoadingProps }
