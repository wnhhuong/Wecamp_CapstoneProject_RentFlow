import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

/**
 * Building blocks shared by the admin details drawers so a request and an
 * invoice read the same way: who it belongs to on top, grouped rows in the
 * middle, and how far along it is at the end.
 */

interface IdentityHeaderProps {
  name: string
  detail: string
  fallbackName?: string
  title?: string
  bordered?: boolean
  className?: string
}

function IdentityHeader({
  name,
  detail,
  fallbackName = 'Unknown',
  title,
  bordered = true,
  className,
}: IdentityHeaderProps) {
  const body = (
    <div className={cn('flex items-center gap-3 self-start', className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-page">
        {buildInitials(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {name || fallbackName}
        </p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  )

  return title ? (
    <DetailSection title={title} bordered={bordered}>
      {body}
    </DetailSection>
  ) : (
    body
  )
}

interface DetailSectionProps {
  title: string
  badge?: ReactNode
  /** Sits at the far end of the heading row; for the section's own action. */
  action?: ReactNode
  bordered?: boolean
  children: ReactNode
}

function DetailSection({
  title,
  badge,
  action,
  bordered = true,
  children,
}: DetailSectionProps) {
  return (
    <section
      className={cn(
        'grid content-start gap-3 pt-4',
        bordered && 'border-t border-hairline',
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {badge}
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

/**
 * Hard facts that are read at a glance rather than compared: the cells sit in
 * a hairline grid instead of ledger rows, which are kept for money and dates.
 */
function FactGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2">
      {children}
    </dl>
  )
}

function Fact({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5 bg-surface px-4 py-3', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

interface TimelineStep {
  label: string
  value: string
  reached: boolean
  isAlert?: boolean
}

function Timeline({
  steps,
  title = 'Timeline',
  bordered = true,
}: {
  steps: TimelineStep[]
  title?: string
  bordered?: boolean
}) {
  return (
    <DetailSection title={title} bordered={bordered}>
      <ol>
        {steps.map((step, index) => (
          <li key={step.label} className="grid grid-cols-[auto_1fr] gap-x-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'mt-1.5 size-2.5 shrink-0 rounded-full',
                  step.isAlert
                    ? 'bg-status-danger-fg'
                    : step.reached
                      ? 'bg-ink'
                      : 'border border-hairline bg-surface',
                )}
              />
              {index < steps.length - 1 ? (
                <span className="w-px flex-1 bg-hairline" />
              ) : null}
            </div>

            <div
              className={cn(
                'flex items-baseline gap-1 text-sm',
                index < steps.length - 1 && 'pb-4',
              )}
            >
              <span className="text-muted-foreground">{step.label}</span>
              <span
                className={cn(
                  'font-medium',
                  step.reached ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.value}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </DetailSection>
  )
}

/** "Nguyễn Văn An" -> "NA". */
function buildInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'

  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''

  return `${first}${last}`.toUpperCase()
}

export { DetailRow, DetailSection, Fact, FactGrid, IdentityHeader, Timeline }
export type { TimelineStep }
