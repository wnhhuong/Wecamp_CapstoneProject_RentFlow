import type { ComponentProps } from 'react'

import { cn } from '@/shared/utils/cn'

/**
 * The single content box every signed-in page sits in, so the gap between the
 * sidebar and the content is identical from page to page. Pages whose content
 * reads better narrow should constrain their inner blocks, not this box.
 */
function PageContainer({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:px-10',
        className,
      )}
      {...props}
    />
  )
}

export { PageContainer }
