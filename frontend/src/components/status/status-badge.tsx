import type { ComponentProps } from 'react'
import type { ContractStatus } from '@/shared/types/contract'
import type { TicketType } from '@/shared/types/ticket'
import type {
  AccountStatus,
  InvoiceStatus,
  RequestStatus,
  RoomStatus,
  TicketStatus,
} from '@/shared/types/status'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/shared/utils/cn'
import { TICKET_TYPE_LABELS } from '@/shared/utils/ticketTypes'

type StatusBadgeProps = ComponentProps<typeof Badge> &
  (
    | { domain: 'room'; status: RoomStatus }
    | { domain: 'invoice'; status: InvoiceStatus }
    | { domain: 'contract'; status: ContractStatus }
    | { domain: 'request'; status: RequestStatus }
    | { domain: 'ticket'; status: TicketStatus }
    | { domain: 'ticketType'; status: TicketType }
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
    not_paid: { label: 'NOT PAID', tone: 'danger' },
  },
  contract: {
    active: { label: 'ACTIVE', tone: 'success' },
    expired: { label: 'EXPIRED', tone: 'neutral' },
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
  ticketType: {
    repair: { label: TICKET_TYPE_LABELS.repair, tone: 'danger' },
    complain: { label: TICKET_TYPE_LABELS.complain, tone: 'info' },
  },
  account: {
    banned: { label: 'BANNED', tone: 'danger' },
    inactive: { label: 'INACTIVE', tone: 'warning' },
    active: { label: 'ACTIVE', tone: 'success' },
  },
} as const satisfies Record<
  | 'room'
  | 'invoice'
  | 'contract'
  | 'request'
  | 'ticket'
  | 'ticketType'
  | 'account',
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
    case 'contract':
      return statusPresentations.contract[props.status]
    case 'request':
      return statusPresentations.request[props.status]
    case 'ticket':
      return statusPresentations.ticket[props.status]
    case 'ticketType':
      return statusPresentations.ticketType[props.status]
    case 'account':
      return statusPresentations.account[props.status]
  }
}

export { StatusBadge }
export type { StatusBadgeProps }
