import type { RequestType } from '@/shared/types/request'
import type { TicketType } from '@/shared/types/ticket'

export interface AdminDashboardRoomSummary {
  availableNow: number
  rented: number
  availableSoon: number
  notAvailable: number
  total: number
  occupancyRate: number
}

export interface AdminDashboardPaymentSummary {
  paid: number
  notPaid: number
  overdue: number
}

export interface BackendAdminDashboardRequest {
  requestID: string
  type: string
  roomCode: string
  userFullName: string
  createDate: string
}

export interface AdminDashboardRequest
  extends Omit<BackendAdminDashboardRequest, 'type'> {
  type: RequestType
  typeLabel: string
}

export interface BackendAdminDashboardTicket {
  ticketID: string
  /** Display code such as RP-A-101-190926-E7F, never the ObjectId. */
  ticketName: string
  type: string
  location: string
  createDate: string
}

export interface AdminDashboardTicket
  extends Omit<BackendAdminDashboardTicket, 'type'> {
  type: TicketType
  typeLabel: string
}

export interface BackendAdminDashboardSummary {
  roomSummary: AdminDashboardRoomSummary
  paymentSummary: AdminDashboardPaymentSummary
  requestsNeedingApproval: BackendAdminDashboardRequest[]
  ticketsNeedingAction: BackendAdminDashboardTicket[]
}

export interface AdminDashboardSummary
  extends Omit<
    BackendAdminDashboardSummary,
    'requestsNeedingApproval' | 'ticketsNeedingAction'
  > {
  requestsNeedingApproval: AdminDashboardRequest[]
  ticketsNeedingAction: AdminDashboardTicket[]
}
