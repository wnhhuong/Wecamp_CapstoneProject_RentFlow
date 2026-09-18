"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/shared/utils/cn"

import { buttonVariants } from "@/components/ui/button"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/icons"

/**
 * react-day-picker ships its own stylesheet; this passes design tokens through
 * its class slots instead, so the calendar matches the rest of the app.
 *
 * In the dropdown caption each select is laid invisibly over `caption_label`,
 * which is the part the tenant actually sees.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown",
  // keeps the tab order matching the visual one once the caption is a dropdown
  navLayout = "after",
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      navLayout={navLayout}
      className={cn("relative w-fit", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex h-8 items-center pr-18",
        dropdowns: "flex items-center gap-1.5",
        dropdown_root: "relative inline-flex",
        dropdown: "absolute inset-0 z-10 w-full cursor-pointer opacity-0",
        caption_label:
          "flex h-8 items-center gap-0.5 rounded-md border border-input bg-field pr-1 pl-2 text-sm font-medium text-foreground",
        nav: "absolute top-3 right-3 flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground hover:text-foreground disabled:opacity-40"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground hover:text-foreground disabled:opacity-40"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-xs font-normal text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "size-9 p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "size-9 font-normal aria-selected:opacity-100"
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-clay-hover",
        today: "[&>button]:border [&>button]:border-clay",
        outside: "[&>button]:text-muted-foreground/50",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "down") {
            return <ChevronDownIcon className="size-4 text-muted-foreground" />
          }
          if (orientation === "left") {
            return <ChevronLeftIcon className="size-4" />
          }

          return <ChevronRightIcon className="size-4" />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
