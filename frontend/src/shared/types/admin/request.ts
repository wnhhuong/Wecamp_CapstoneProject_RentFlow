import type { RequestType } from '@/shared/types/request'
import type { InvoiceStatus, RequestStatus } from '@/shared/types/status'

export interface AdminRequest {
  requestID: string
  /** Human-readable code, e.g. "PAI-A-102-300924". */
  displayID: string
  type: RequestType
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

export interface AdminInvoiceDetails {
  invoiceID: string
  invoiceDisplayID: string
  totalBill: number
  dueDate: string
  invoiceStatus: InvoiceStatus
}

/**
 * Only the types the owner can act on carry a detail block; the rest are listed
 * with their shared fields until their approval flow exists.
 */
export interface AdminRequestDetail extends AdminRequest {
  consumption: AdminConsumptionDetails | null
  invoice: AdminInvoiceDetails | null
}

export interface ApproveRequestResult {
  requestID: string
  type: RequestType
  status: RequestStatus
  resolveDate: string
}
