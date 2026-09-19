import type { InvoiceStatus, RequestStatus, TicketStatus } from '@/shared/types/status'
import type { RequestType } from '@/shared/types/request'
import type { TicketType } from '@/shared/types/ticket'

export interface BackendTenantDashboard {
  currentInvoice?: {
    invoiceID: string | number
    billingPeriod?: string | null
    totalBill?: number
    status?: string
    isOverdue?: boolean
    dueDate: string
    breakdown?: Partial<Record<InvoiceBillKey, number>>
  } | null
  electricityReminder?: {
    state?: string
    startDate: string
    endDate: string
  } | null
  activeTickets?: {
    ticketID: string | number
    ticketType?: string | null
    description?: string | null
    status?: string
    createDate: string
  }[]
  pendingRequests?: {
    requestID: string | number
    displayID?: string | null
    type?: string
    createDate: string
    status?: string
  }[]
}

export type InvoiceBillKey =
  | 'room'
  | 'electrical'
  | 'water'
  | 'wifi'
  | 'parking'
  | 'other'

export interface DashboardInvoice {
  invoiceID: string
  /** "YYYY-MM" of the consumption the invoice bills, not of its due date. */
  billingPeriod: string
  totalBill: number
  status: InvoiceStatus
  isOverdue: boolean
  dueDate: string
  breakdown: Record<InvoiceBillKey, number>
}

/** Where this month sits against the meter-reading window. */
export type ElectricityReminderState =
  | 'not_due'
  | 'due_not_uploaded'
  | 'submitted'

export interface DashboardElectricity {
  state: ElectricityReminderState
  startDate: string
  endDate: string
}

export interface DashboardTicket {
  ticketID: string
  type: TicketType
  description: string
  status: TicketStatus
  createDate: string
}

export interface DashboardRequest {
  requestID: string
  displayID: string
  type: RequestType
  createDate: string
  status: RequestStatus
}

export interface TenantDashboard {
  invoice: DashboardInvoice | null
  electricity: DashboardElectricity
  tickets: DashboardTicket[]
  requests: DashboardRequest[]
}
