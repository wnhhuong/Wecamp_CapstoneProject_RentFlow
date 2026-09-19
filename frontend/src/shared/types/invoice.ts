import type { BackendPagination } from '@/shared/types/api'
import type { InvoiceStatus, RequestStatus } from '@/shared/types/status'

export interface InvoiceBreakdown {
  room: number
  electrical: number
  water: number
  wifi: number
  parking: number
  other: number
}

export interface BackendTenantInvoice {
  invoiceID: string
  displayID?: string
  roomCode?: string
  createDate: string
  billingMonth: string | null
  dueDate: string
  totalBill: number
  status?: string
  isOverdue?: boolean
  isRequestLate?: boolean
}

export interface BackendTenantInvoiceList {
  items: BackendTenantInvoice[]
  pagination?: BackendPagination
}

export interface TenantInvoice {
  invoiceID: string
  displayID: string
  roomCode: string
  createDate: string
  billingMonth: string | null
  dueDate: string
  totalBill: number
  status: InvoiceStatus
  isOverdue: boolean
  isRequestLate: boolean
}

/**
 * The detail endpoint returns the display code in `invoiceID` and has no
 * separate `displayID`, so the mapper renames it.
 */
export interface BackendTenantInvoiceDetail {
  invoiceID: string
  roomCode: string
  createDate: string
  billingMonth?: string | null
  paymentDate: string | null
  dueDate: string
  status?: string
  isOverdue?: boolean
  isRequestLate?: boolean
  meterReading?: number
  lastReading?: number
  usage?: number
  unitPrice?: number
  breakdown: Partial<InvoiceBreakdown>
  totalBill: number
}

export interface TenantInvoiceDetail {
  displayID: string
  roomCode: string
  createDate: string
  billingMonth: string | null
  paymentDate: string | null
  dueDate: string
  status: InvoiceStatus
  isOverdue: boolean
  isRequestLate: boolean
  /** Cumulative meter number the tenant submitted, not the kWh used. */
  meterReading: number | null
  /** Meter number of the previous reading; 0 for the first billing period. */
  lastReading: number | null
  /** kWh billed this period, i.e. meterReading - lastReading. */
  usage: number | null
  /** Price per kWh derived from the invoice, null when it cannot be derived. */
  unitPrice: number | null
  breakdown: InvoiceBreakdown
  totalBill: number
}

export interface BackendInvoiceRequest {
  requestID: string
  invoiceID: string
  type?: string
  createDate: string
  status?: string
}

/** A request a tenant raises against one invoice: a paid notice or a late payment. */
export interface TenantInvoiceRequest {
  requestID: string
  invoiceID: string
  createDate: string
  status: RequestStatus
}

/** Where a tenant sends the transfer, configured by the owner in Parameters. */
export interface TenantPaymentInfo {
  bankAccountHolder: string
  bankName: string
  bankAccountNumber: string
  /** Absolute URL of the owner's QR image, null when none was uploaded. */
  bankQrImage: string | null
}
