import type { ApiPagination } from '@/shared/types/api'
import type { InvoiceBreakdown } from '@/shared/types/invoice'
import type { InvoiceStatus } from '@/shared/types/status'

export interface AdminInvoice {
  invoiceID: string
  displayID: string
  /** Tenant billed for this period, empty when no contract covers it. */
  tenantName: string
  roomCode: string
  /** Billing period as "YYYY-MM". */
  billingPeriod: string
  createDate: string
  dueDate: string
  totalBill: number
  received: number
  stillOwed: number
  status: InvoiceStatus
  isOverdue: boolean
  isRequestLate: boolean
}

/** Money for the newest billing period, fixed whatever the table is filtered by. */
export interface AdminInvoiceSummary {
  /** The period these totals cover; null when there are no invoices at all. */
  billingPeriod: string | null
  billed: number
  received: number
  stillOwed: number
}

export interface AdminInvoiceList {
  items: AdminInvoice[]
  /** Periods that have invoices, newest first, for the month filter. */
  billingPeriods: string[]
  summary: AdminInvoiceSummary
  pagination: ApiPagination
}

export interface AdminInvoiceQuery {
  search?: string
  status?: InvoiceStatus
  isRequestLate?: boolean
  billingPeriod?: string
  page?: number
  limit?: number
}

export interface AdminInvoiceDetail {
  invoiceID: string
  displayID: string
  billingPeriod: string
  roomID: string
  roomCode: string
  tenantName: string
  createDate: string
  paymentDate: string | null
  dueDate: string
  status: InvoiceStatus
  isOverdue: boolean
  isRequestLate: boolean
  /** Cumulative meter number, not the kWh used. */
  meterReading: number | null
  usageKwh: number | null
  unitPrice: number | null
  /** The unit price fell back to today's parameter instead of the billed one. */
  unitPriceIsApprox: boolean
  breakdown: InvoiceBreakdown
  totalBill: number
  received: number
  stillOwed: number
}
