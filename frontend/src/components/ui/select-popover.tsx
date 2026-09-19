import { Popover } from "radix-ui"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ChevronDownIcon } from "@/components/ui/icons"
import { cn } from "@/shared/utils/cn"

interface SelectPopoverItem {
  value: string
  label: string
}

interface SelectPopoverProps {
  id?: string
  /** Null while the options are still loading. */
  items: SelectPopoverItem[] | null
  value: string
  onChange: (value: string) => void
  placeholder: string
  loadingLabel?: string
  emptyLabel?: string
  invalid?: boolean
  disabled?: boolean
  describedBy?: string
}

/**
 * Single-select list in a popover, used instead of a native <select>. It is
 * modal because a dialog's focus trap swallows the clicks otherwise, and it
 * sits above the dialog, whose own overlay is already at z-50.
 */
function SelectPopover({
  id,
  items,
  value,
  onChange,
  placeholder,
  loadingLabel = "Loading…",
  emptyLabel = "Nothing to choose from.",
  invalid = false,
  disabled = false,
  describedBy,
}: SelectPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = items?.find((item) => item.value === value)

  return (
    <Popover.Root modal open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn(
            "group w-full justify-between bg-field font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? selected.label : items === null ? loadingLabel : placeholder}
          <ChevronDownIcon className="size-4 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-[60] w-[var(--radix-popover-trigger-width)] rounded-lg border border-hairline bg-card py-1.5 shadow-[0_16px_40px_rgba(23,30,38,0.16)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {items && items.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {items.map((item) => (
                <li key={item.value}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-ink/[0.06]",
                      item.value === value && "font-medium text-clay",
                    )}
                    onClick={() => {
                      onChange(item.value)
                      setIsOpen(false)
                    }}
                  >
                    {item.label}
                    {item.value === value ? (
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full bg-clay"
                      />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {emptyLabel}
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export { SelectPopover }
export type { SelectPopoverItem }
