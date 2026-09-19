import type { ApiPagination } from '@/shared/types/api'
import type { TicketStatus } from '@/shared/types/status'
import type { TicketType } from '@/shared/types/ticket'

export interface BackendAdminTicketListResponse {
  items?: BackendAdminTicket[]
}

export interface BackendAdminTicket {
  ticketID: string | number
  displayID?: string | null
  ticketType?: string | null
  description?: string | null
  location?: string | null
  image?: string | null
  roomID?: string | number | null
  roomCode?: string | null
  createDate: string
  resolveDate?: string | null
  status?: string
}

export interface BackendTicketStatusUpdate {
  ticketID: string | number
  status?: string
  resolveDate?: string | null
}

export interface AdminTicket {
  ticketID: string
  displayID: string
  type: TicketType
  description: string
  location: string
  image: string
  roomID: string
  roomCode: string
  createDate: string
  resolveDate: string | null
  status: TicketStatus
}

export interface AdminTicketQuery {
  search?: string
  type?: TicketType
  status?: TicketStatus
  page?: number
  limit?: number
}

export interface AdminTicketList {
  items: AdminTicket[]
  pagination: ApiPagination
}
