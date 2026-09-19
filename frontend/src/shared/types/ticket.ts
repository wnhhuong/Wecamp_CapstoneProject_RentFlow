import type { ApiPagination } from '@/shared/types/api'
import type { TicketStatus } from '@/shared/types/status'

export interface BackendTenantTicketListResponse {
  items?: BackendTenantTicket[]
}

export interface BackendTenantTicket {
  ticketID: string | number
  displayID?: string | null
  description?: string | null
  location?: string | null
  roomCode?: string | null
  ticketType?: string | null
  createDate: string
  resolveDate?: string | null
  status?: string
}

export type TicketType = 'repair' | 'complain'

export interface TenantTicket {
  ticketID: string
  displayID: string
  type: TicketType
  description: string
  location: string
  createDate: string
  resolveDate: string | null
  status: TicketStatus
}

export interface TenantTicketQuery {
  search?: string
  type?: TicketType
  status?: TicketStatus
  page?: number
  limit?: number
}

export interface TenantTicketList {
  items: TenantTicket[]
  pagination: ApiPagination
}
