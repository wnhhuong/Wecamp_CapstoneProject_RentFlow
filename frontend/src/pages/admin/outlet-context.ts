import type { AdminRequest } from '@/shared/types/admin/request'
import type { AdminRoom } from '@/shared/types/admin/room'
import type { AdminTicket } from '@/shared/types/admin/ticket'

/**
 * Every admin drawer is a child route, so the list page hands its loaded rows
 * and its callbacks down through `<Outlet context>` instead of props.
 */
export interface RoomsOutletContext {
  rooms: AdminRoom[]
  onPrepareAccount: (roomID: string) => void
  onEditRoom: (roomID: string) => void
}

export interface RequestsOutletContext {
  requests: AdminRequest[]
  onApproved: (requestID: string) => void
}

export interface TicketsOutletContext {
  tickets: AdminTicket[]
  onUpdated: (ticket: AdminTicket) => void
}
