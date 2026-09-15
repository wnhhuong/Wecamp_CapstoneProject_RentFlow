import type { ComponentProps } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/shared/utils/cn'

type RoomStatus =
  | 'available now'
  | 'rented'
  | 'available soon'
  | 'not available'
type InvoiceStatus = 'paid' | 'pending' | 'not_paid'
type RequestStatus = 'pending' | 'approved'
type TicketStatus = 'need_action' | 'in_progress' | 'done'
type AccountStatus = 'banned' | 'inactive' | 'active'

type StatusBadgeProps = ComponentProps<typeof Badge> &
  (
    | { domain: 'room'; status: RoomStatus }
    | { domain: 'invoice'; status: InvoiceStatus }
    | { domain: 'request'; status: RequestStatus }
    | { domain: 'ticket'; status: TicketStatus }
    | { domain: 'account'; status: AccountStatus }
  )

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface StatusPresentation {
  label: string
  tone: StatusTone
}

const statusPresentations = {
  room: {
    'available now': { label: 'AVAILABLE NOW', tone: 'success' },
    rented: { label: 'RENTED', tone: 'neutral' },
    'available soon': { label: 'AVAILABLE SOON', tone: 'warning' },
    'not available': { label: 'NOT AVAILABLE', tone: 'danger' },
  },
  invoice: {
    paid: { label: 'PAID', tone: 'success' },
    pending: { label: 'PENDING', tone: 'warning' },
    not_paid: { label: 'NOT PAID', tone: 'danger' },
  },
  request: {
    pending: { label: 'PENDING', tone: 'warning' },
    approved: { label: 'APPROVED', tone: 'info' },
  },
  ticket: {
    need_action: { label: 'NEED ACTION', tone: 'danger' },
    in_progress: { label: 'IN PROGRESS', tone: 'warning' },
    done: { label: 'DONE', tone: 'info' },
  },
  account: {
    banned: { label: 'BANNED', tone: 'danger' },
    inactive: { label: 'INACTIVE', tone: 'warning' },
    active: { label: 'ACTIVE', tone: 'success' },
  },
} as const satisfies Record<
  'room' | 'invoice' | 'request' | 'ticket' | 'account',
  Record<string, StatusPresentation>
>

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-status-success-bg text-status-success-fg',
  warning: 'bg-status-warning-bg text-status-warning-fg',
  danger: 'bg-status-danger-bg text-status-danger-fg',
  info: 'bg-status-info-bg text-status-info-fg',
  neutral: 'bg-status-neutral-bg text-status-neutral-fg',
}

function StatusBadge(statusBadgeProps: StatusBadgeProps) {
  const presentation = getStatusPresentation(statusBadgeProps)
  const { domain, status, className, ...props } = statusBadgeProps

  return (
    <Badge
      data-domain={domain}
      data-status={status}
      className={cn(
        'border-transparent px-2.5 py-1 text-xs font-medium',
        toneClasses[presentation.tone],
        className,
      )}
      {...props}
    >
      {presentation.label}
    </Badge>
  )
}

function getStatusPresentation(props: StatusBadgeProps): StatusPresentation {
  switch (props.domain) {
    case 'room':
      return statusPresentations.room[props.status]
    case 'invoice':
      return statusPresentations.invoice[props.status]
    case 'request':
      return statusPresentations.request[props.status]
    case 'ticket':
      return statusPresentations.ticket[props.status]
    case 'account':
      return statusPresentations.account[props.status]
  }
}

export { StatusBadge }
export type {
  AccountStatus,
  InvoiceStatus,
  RequestStatus,
  RoomStatus,
  StatusBadgeProps,
  TicketStatus,
}
