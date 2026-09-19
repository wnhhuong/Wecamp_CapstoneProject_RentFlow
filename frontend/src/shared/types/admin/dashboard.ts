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

export interface AdminDashboardRequest {
  requestID: string
  type: string
  typeLabel: string
  roomCode: string
  userFullName: string
  createDate: string
}

export interface AdminDashboardTicket {
  ticketID: string
  ticketName: string
  type: string
  location: string
  createDate: string
}

export interface AdminDashboardSummary {
  roomSummary: AdminDashboardRoomSummary
  paymentSummary: AdminDashboardPaymentSummary
  requestsNeedingApproval: AdminDashboardRequest[]
  ticketsNeedingAction: AdminDashboardTicket[]
}
