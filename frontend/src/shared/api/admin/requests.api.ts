import { apiRequest } from '@/shared/api/client'
import { API_BASE_URL } from '@/shared/api/config'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  AdminConsumptionRequest,
  ApproveConsumptionResult,
} from '@/shared/types/admin/request'
import type { RequestStatus } from '@/shared/types/status'
import { formatMonthYear } from '@/shared/utils/dateFormatter'

interface BackendRequestListResponse {
  items?: BackendRequestListItem[]
  pagination?: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

interface BackendRequestListItem {
  requestID: string | number
  type: string
  roomID?: string | number
  roomCode?: string
  userID?: string | number
  userFullName?: string
  createDate: string
  resolveDate?: string | null
  status: RequestStatus
}

interface BackendRequestDetail {
  requestID: string | number
  type: string
  room: {
    roomID: string | number
    roomCode: string
  }
  user: {
    userID: string | number
    fullName: string
  }
  createDate: string
  resolveDate?: string | null
  status: RequestStatus
  details: {
    image?: string
    reading?: number
    currentReading?: number
    capturedAt?: string
    previousReading?: number
    previousMeterReading?: number
    baseReading?: number
    usage?: number
    consumptionID?: string | number | null
  }
}

interface BackendApproveResponse {
  requestID: string | number
  type: string
  resolveDate: string
  status: RequestStatus
  result?: {
    consumptionID?: string | number | null
    meterReading?: number
    usage?: number
    consumpAmount?: number
    trackingTime?: string
    invoice?: {
      _id?: string | number
      invoiceID?: string | number
      status?: string
      dueDate?: string
    }
  }
}

const REQUEST_PAGE_SIZE = 100
const CONSUMPTION_REQUEST_TYPE = 'consump'

export async function getAdminConsumptionRequests(): Promise<
  AdminConsumptionRequest[]
> {
  const response = await apiRequest<BackendRequestListResponse | BackendRequestListItem[]>(
    `${ENDPOINTS.admin.requests}?type=${CONSUMPTION_REQUEST_TYPE}&limit=${REQUEST_PAGE_SIZE}`,
    { auth: 'admin' },
  )
  const items = Array.isArray(response) ? response : response.items ?? []

  const details = await Promise.all(
    items
      .filter((item) => item.type === CONSUMPTION_REQUEST_TYPE)
      .map((item) => getAdminConsumptionRequest(String(item.requestID))),
  )

  return details
}

export async function getAdminConsumptionRequest(
  requestID: string,
): Promise<AdminConsumptionRequest> {
  const detail = await apiRequest<BackendRequestDetail>(
    ENDPOINTS.admin.request(requestID),
    { auth: 'admin' },
  )

  return mapConsumptionDetail(detail)
}

export async function approveAdminConsumptionRequest(
  requestID: string,
): Promise<ApproveConsumptionResult> {
  const approved = await apiRequest<BackendApproveResponse>(
    ENDPOINTS.admin.approveRequest(requestID),
    {
      auth: 'admin',
      method: 'PATCH',
    },
  )
  const request = await getAdminConsumptionRequest(String(approved.requestID))
  const invoice = approved.result?.invoice

  if (!invoice || (!invoice._id && !invoice.invoiceID) || !invoice.dueDate) {
    throw new Error('Approval succeeded, but the created invoice was not returned.')
  }

  if (invoice.status !== 'not_paid') {
    throw new Error('The created invoice did not start with NOT PAID status.')
  }

  return {
    request,
    consumption: {
      consumptionID:
        approved.result?.consumptionID !== undefined &&
        approved.result.consumptionID !== null
          ? String(approved.result.consumptionID)
          : request.consumptionID,
      roomCode: request.roomCode,
      meterReading: approved.result?.meterReading ?? request.currentReading,
      usage:
        approved.result?.usage ??
        approved.result?.consumpAmount ??
        request.usage,
      trackingTime: approved.result?.trackingTime ?? request.capturedAt,
    },
    invoice: {
      invoiceID: String(invoice.invoiceID ?? invoice._id),
      status: 'not_paid',
      dueDate: invoice.dueDate,
    },
  }
}

function mapConsumptionDetail(
  detail: BackendRequestDetail,
): AdminConsumptionRequest {
  const currentReading =
    detail.details.currentReading ?? detail.details.reading ?? 0
  const previousReading =
    detail.details.previousReading ??
    detail.details.previousMeterReading ??
    detail.details.baseReading ??
    0
  const usage =
    detail.details.usage ??
    currentReading - previousReading
  const capturedAt = detail.details.capturedAt ?? detail.createDate

  return {
    requestID: String(detail.requestID),
    roomCode: detail.room.roomCode,
    tenantName: detail.user.fullName,
    status: detail.status,
    createDate: detail.createDate,
    resolveDate: detail.resolveDate ?? null,
    capturedAt,
    meterImage: toAbsoluteAssetUrl(detail.details.image ?? ''),
    previousReading,
    currentReading,
    usage,
    billingPeriod: formatMonthYear(capturedAt),
    invoiceDueDate: getNextMonthDate(capturedAt, 5),
    consumptionID:
      detail.details.consumptionID !== undefined &&
      detail.details.consumptionID !== null
        ? String(detail.details.consumptionID)
        : null,
  }
}

function toAbsoluteAssetUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path

  const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin
  return new URL(path, `${apiOrigin}/`).toString()
}

function getNextMonthDate(value: string, day: number) {
  const date = new Date(value)
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, day),
  ).toISOString()
}
