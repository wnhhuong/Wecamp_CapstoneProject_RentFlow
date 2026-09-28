import type { TicketType } from '@/shared/types/ticket'

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  repair: 'Repair',
  complain: 'Complaint',
}

export const TICKET_TYPE_OPTIONS = (
  Object.keys(TICKET_TYPE_LABELS) as TicketType[]
).map((type) => ({ value: type, label: TICKET_TYPE_LABELS[type] }))

export function mapTicketType(type?: string | null): TicketType {
  return type === 'complain' ? 'complain' : 'repair'
}
