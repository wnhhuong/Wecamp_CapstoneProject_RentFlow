export type RoomStatus =
  | 'available now'
  | 'rented'
  | 'available soon'
  | 'not available'

export type InvoiceStatus =
  | 'not_paid'
  | 'paid'

export type RequestStatus =
  | 'pending'
  | 'approved'

export type TicketStatus =
  | 'need_action'
  | 'in_progress'
  | 'done'

export type AccountStatus =
  | 'banned'
  | 'inactive'
  | 'active'