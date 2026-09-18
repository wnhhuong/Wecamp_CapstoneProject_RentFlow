import type { RequestType } from '@/shared/types/request'
import type { InvoiceStatus, RequestStatus } from '@/shared/types/status'

export interface BackendRequestListResponse {
  items?: BackendRequestListItem[]
}

export interface BackendRequestListItem {
  requestID: string | number
  displayID?: string | null
  type: string
  roomCode?: string | null
  userFullName?: string | null
  createDate: string
  resolveDate?: string | null
  status?: string
}

export interface BackendRequestDetail extends BackendRequestListItem {
  room?: { roomID: string | number; roomCode: string } | null
  user?: { userID: string | number; fullName: string } | null
  details?: {
    image?: string
    currentReading?: number
    previousReading?: number
    usage?: number
    capturedAt?: string
    invoiceID?: string | number
    invoiceDisplayID?: string | null
    invoiceTotalBill?: number
    invoiceDueDate?: string
    invoiceStatus?: string
    contractID?: string | number
    contractDisplayID?: string | null
    contractExpireDate?: string
    yearToExtend?: number
  } | null
}

export interface BackendApproveResponse {
  requestID: string | number
  type: string
  resolveDate: string
  status?: string
}

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

export interface AdminExtensionDetails {
  contractDisplayID: string
  expireDate: string
  yearToExtend: number
}

/**
 * Only the types the owner can act on carry a detail block; the rest are listed
 * with their shared fields until their approval flow exists.
 */
export interface AdminRequestDetail extends AdminRequest {
  roomID: string
  consumption: AdminConsumptionDetails | null
  extension: AdminExtensionDetails | null
  invoice: AdminInvoiceDetails | null
}

export interface ApproveRequestResult {
  requestID: string
  type: RequestType
  status: RequestStatus
  resolveDate: string
}
