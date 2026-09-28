import type { BackendPagination } from '@/shared/types/api'
import type { RequestStatus } from '@/shared/types/status'

export type RequestType =
  | 'consump'
  | 'paid'
  | 'delay'
  | 'extend'
  | 'moveout'
  | 'checkout'

export interface BackendTenantRequest {
  requestID: string
  displayID?: string
  roomCode?: string
  type: string
  createDate: string
  resolveDate?: string | null
  status?: string
}

export interface BackendTenantRequestList {
  items: BackendTenantRequest[]
  pagination?: BackendPagination
}

export interface BackendTenantRequestDetail extends BackendTenantRequest {
  details?: {
    image?: string
    reading?: number
    capturedAt?: string
    invoiceID?: string
    invoiceDisplayID?: string
    contractID?: string
    contractDisplayID?: string
    requestMoveoutDate?: string
    finalImage?: string
    finalReading?: number
  } | null
}

export interface TenantRequest {
  /** Database id, used for the details route. */
  requestID: string
  /** Human-readable code, e.g. "DEL-A-101-300924". */
  displayID: string
  type: RequestType
  createDate: string
  resolveDate: string | null
  status: RequestStatus
}

export interface BackendExtendRequest {
  requestID: string
  displayID?: string
  type?: string
  contractID?: string
  yearToExtend: number
  createDate: string
  status?: string
}

export interface TenantRequestReceipt {
  requestID: string
  displayID: string
  createDate: string
  status: RequestStatus
}

export interface TenantExtendReceipt extends TenantRequestReceipt {
  contractID: string
  yearToExtend: number
}

export interface BackendMoveoutRequest {
  requestID: string
  displayID?: string
  type?: string
  contractID?: string
  requestMoveoutDate: string
  createDate: string
  status?: string
}

export interface TenantMoveoutReceipt extends TenantRequestReceipt {
  contractID: string
  requestMoveoutDate: string
}

export interface BackendCheckoutRequest {
  requestID: string
  displayID?: string
  type?: string
  contractID?: string
  finalImage?: string
  finalReading: number
  createDate: string
  status?: string
}

export interface TenantCheckoutReceipt extends TenantRequestReceipt {
  contractID: string
  finalReading: number
}

export interface SubmitCheckoutInput {
  finalImage: File
  finalReading: number
}

export interface TenantRequestInvoice {
  invoiceID: string
  displayID: string
}

export interface TenantRequestConsumption {
  meterImage: string
  reading: number
  capturedAt: string
}

export interface TenantRequestContract {
  displayID: string
  requestedMoveoutDate: string | null
}

export interface TenantRequestCheckout {
  meterImage: string
  finalReading: number
}

/** Each request type fills in one of these blocks; the rest stay null. */
export interface TenantRequestDetail extends TenantRequest {
  roomCode: string
  consumption: TenantRequestConsumption | null
  invoice: TenantRequestInvoice | null
  contract: TenantRequestContract | null
  checkout: TenantRequestCheckout | null
}
