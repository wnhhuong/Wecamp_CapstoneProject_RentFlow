import type { ApiPagination, BackendPagination } from '@/shared/types/api'
import type { TicketStatus } from '@/shared/types/status'

export interface BackendTenantTicketListResponse {
  items?: BackendTenantTicket[]
  pagination?: BackendPagination
}

export interface BackendTenantTicket {
  ticketID: string | number
  displayID?: string | null
  description?: string | null
  location?: string | null
  image?: string | null
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
  /** Repair photo; a complaint has none. */
  image: string
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

export interface BackendRepairOptions {
  roomID: string | number
  roomCode?: string | null
  facilities?: BackendRepairFacility[]
}

export interface BackendRepairFacility {
  facilityID: string | number
  typeID: string | number
  typeName?: string | null
}

export interface RepairFacilityOption {
  facilityID: string
  /** Type name, numbered when the room holds more than one of that type. */
  label: string
}

export interface RepairOptions {
  roomCode: string
  facilities: RepairFacilityOption[]
}

export interface SubmitRepairInput {
  facilityID: string
  description: string
  image: File
}

export interface BackendCreatedTicket {
  ticketID: string | number
  ticketName?: string | null
  type?: string | null
  description?: string | null
  createDate: string
  status?: string
}

export interface TenantTicketReceipt {
  ticketID: string
  displayID: string
  type: TicketType
  description: string
  createDate: string
  status: TicketStatus
}

export interface BackendComplaintOptions {
  areas?: BackendComplaintArea[]
}

export interface BackendComplaintArea {
  areaID: string | number
  areaName?: string | null
  rooms?: { roomID: string | number; roomCode?: string | null }[]
}

export interface ComplaintArea {
  areaID: string
  areaName: string
  rooms: { roomID: string; roomCode: string }[]
}

export interface ComplaintOptions {
  areas: ComplaintArea[]
}

export interface SubmitComplaintInput {
  areaID: string
  roomID: string
  description: string
}
