import { Popover } from 'radix-ui'

import { Button } from '@/components/ui/button'
import { ChevronDownIcon, CloseIcon, SearchIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { cn } from '@/shared/utils/cn'

interface FilterOption {
  value: string
  label: string
}

interface FilterGroup {
  /** Key passed back to onFilterChange. */
  id: string
  /** Name of the group, shown on the trigger and the panel header. */
  label: string
  options: FilterOption[]
  /** Empty means no constraint: the page should not filter on this group. */
  selected: string[]
}

interface SearchFilterProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  /** Accessible name for the search box, e.g. "Search rooms". */
  searchLabel: string
  filters?: FilterGroup[]
  onFilterChange?: (id: string, selected: string[]) => void
  onClearFilters?: () => void
  /** Rows after filtering and the total, for the "Showing x of y" line. */
  resultCount?: number
  totalCount?: number
  /** Noun for that line, e.g. "room" -> "Showing 3 of 12 rooms". */
  itemNoun?: string
  className?: string
}

/**
 * Search box plus multi-select filter dropdowns for list and table screens.
 * Picking nothing in a group means "all"; picking several options widens the
 * result. Everything currently applied is listed as a removable chip below.
 */
function SearchFilter({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchLabel,
  filters = [],
  onFilterChange,
  onClearFilters,
  resultCount,
  totalCount,
  itemNoun = 'item',
  className,
}: SearchFilterProps) {
  const activeTags = filters.flatMap((filter) =>
    filter.options
      .filter((option) => filter.selected.includes(option.value))
      .map((option) => ({ filter, option })),
  )

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-hairline bg-surface p-3">
        <div className="relative min-w-[14rem] flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="bg-white pl-9"
          />
        </div>

        {filters.map((filter) => (
          <FilterDropdown
            key={filter.id}
            filter={filter}
            onChange={(selected) => onFilterChange?.(filter.id, selected)}
          />
        ))}
      </div>

      {activeTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeTags.map(({ filter, option }) => (
            <span
              key={`${filter.id}:${option.value}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-sm text-foreground"
            >
              <span className="text-muted-foreground">{filter.label}:</span>
              {option.label}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${filter.label} ${option.label}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() =>
                  onFilterChange?.(
                    filter.id,
                    filter.selected.filter((value) => value !== option.value),
                  )
                }
              >
                <CloseIcon className="size-3" />
              </Button>
            </span>
          ))}

          {onClearFilters ? (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm text-muted-foreground"
              onClick={onClearFilters}
            >
              Clear all
            </Button>
          ) : null}
        </div>
      ) : null}

      {resultCount !== undefined && totalCount !== undefined ? (
        <p className="text-sm text-muted-foreground">
          Showing {resultCount} of {totalCount}{' '}
          {totalCount === 1 ? itemNoun : `${itemNoun}s`}
        </p>
      ) : null}
    </div>
  )
}

function FilterDropdown({
  filter,
  onChange,
}: {
  filter: FilterGroup
  onChange: (selected: string[]) => void
}) {
  const { label, options, selected } = filter
  const isActive = selected.length > 0

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    )
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={label}
          className={cn(
            'group gap-2 bg-field font-normal',
            isActive && 'border-clay bg-clay/5 text-clay',
          )}
        >
          {label}
          {isActive ? (
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-clay"
            />
          ) : null}
          <ChevronDownIcon className="size-4 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 w-56 rounded-lg border border-hairline bg-card py-1.5 shadow-[0_16px_40px_rgba(23,30,38,0.16)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <p className="border-b border-hairline px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>

          <ul className="max-h-64 overflow-y-auto py-1">
            {options.map((option) => (
              <li key={option.value}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-ink/[0.06]">
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => toggle(option.value)}
                    className="size-4 shrink-0 accent-clay"
                  />
                  {option.label}
                </label>
              </li>
            ))}
          </ul>

          {isActive ? (
            <div className="border-t border-hairline px-3 pt-2">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm text-clay"
                onClick={() => onChange([])}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { SearchFilter }
export type { FilterGroup, FilterOption, SearchFilterProps }
