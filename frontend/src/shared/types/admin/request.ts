import type { RequestStatus } from '@/shared/types/status'

export interface AdminConsumptionRequest {
  requestID: string
  roomCode: string
  tenantName: string
  status: RequestStatus
  createDate: string
  resolveDate: string | null
  capturedAt: string
  meterImage: string
  previousReading: number
  currentReading: number
  usage: number
  billingPeriod: string
  invoiceDueDate: string
  consumptionID: string | null
}

export interface ApproveConsumptionResult {
  request: AdminConsumptionRequest
  consumption: {
    consumptionID: string | null
    roomCode: string
    meterReading: number
    usage: number
    trackingTime: string
  }
  invoice: {
    invoiceID: string
    status: 'not_paid'
    dueDate: string
  }
}
