import type { InvoiceStatus, RequestStatus } from '@/shared/types/status'

export type AdminRequestType =
  | 'consump'
  | 'paid'
  | 'delay'
  | 'extend'
  | 'moveout'
  | 'checkout'

export interface AdminRequest {
  requestID: string
  /** Human-readable code, e.g. "PAI-A-102-300924". */
  displayID: string
  type: AdminRequestType
  roomCode: string
  tenantName: string
  createDate: string
  resolveDate: string | null
  status: RequestStatus
}

export interface AdminConsumptionDetails {
  meterImage: string
  previousReading: number
  currentReading: number
  usage: number
  capturedAt: string
  billingPeriod: string
}

export interface AdminPaidDetails {
  invoiceID: string
  invoiceDisplayID: string
  totalBill: number
  invoiceStatus: InvoiceStatus
}

/**
 * Only the types the owner can act on carry a detail block; the rest are listed
 * with their shared fields until their approval flow exists.
 */
export interface AdminRequestDetail extends AdminRequest {
  consumption: AdminConsumptionDetails | null
  paid: AdminPaidDetails | null
}

export interface ApproveRequestResult {
  requestID: string
  type: AdminRequestType
  status: RequestStatus
  resolveDate: string
  /** Due date of the invoice a consumption approval creates. */
  createdInvoiceDueDate: string | null
}
