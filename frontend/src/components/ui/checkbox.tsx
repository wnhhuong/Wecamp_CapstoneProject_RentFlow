import type { ComponentProps } from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { CheckIcon } from "@/components/ui/icons"
import { cn } from "@/shared/utils/cn"

/**
 * Box-only control, used instead of `<input type="checkbox">` so the tick
 * follows the design tokens rather than the browser's accent colour. Pair it
 * with a `<Label htmlFor>` for the text next to it.
 */
function Checkbox({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-input bg-field outline-none transition-[color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-white",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center text-current">
        <CheckIcon className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
