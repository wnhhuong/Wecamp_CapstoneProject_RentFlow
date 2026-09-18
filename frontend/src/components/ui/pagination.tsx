import { Button } from '@/components/ui/button'
import { cn } from '@/shared/utils/cn'

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  /** Noun for the summary line, e.g. "invoice" -> "42 invoices". */
  itemNoun?: string
  onPageChange: (page: number) => void
  isBusy?: boolean
  className?: string
}

/** Previous/next paging for server-paged tables. Hidden when everything fits on one page. */
function Pagination({
  page,
  totalPages,
  totalItems,
  itemNoun = 'item',
  onPageChange,
  isBusy = false,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 text-sm',
        className,
      )}
    >
      <p className="text-muted-foreground">
        Page {page} of {totalPages} · {totalItems}{' '}
        {totalItems === 1 ? itemNoun : `${itemNoun}s`}
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export { Pagination }
