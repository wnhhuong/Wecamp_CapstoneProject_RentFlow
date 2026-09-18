import { apiRequest } from '@/shared/api/client'
import { API_BASE_URL } from '@/shared/api/config'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  BackendExtendRequest,
  BackendMoveoutRequest,
  BackendTenantRequest,
  BackendTenantRequestDetail,
  BackendTenantRequestList,
  TenantExtendRequest,
  TenantMoveoutRequest,
  TenantRequest,
  TenantRequestDetail,
} from '@/shared/types/request'
import { mapRequestType } from '@/shared/utils/requestTypes'
import { mapRequestStatus } from '@/shared/utils/statusMapper'

/**
 * A tenancy produces a handful of requests, so the list is loaded once and
 * filtered in the page instead of round-tripping for every filter change.
 */
const REQUESTS_PAGE_SIZE = 100

export async function getTenantRequests(
  signal?: AbortSignal,
): Promise<TenantRequest[]> {
  const searchParams = new URLSearchParams({
    page: '1',
    limit: String(REQUESTS_PAGE_SIZE),
  })

  const response = await apiRequest<BackendTenantRequestList>(
    `${ENDPOINTS.user.requests}?${searchParams.toString()}`,
    { auth: 'user', signal },
  )

  return response.items.map(mapTenantRequest)
}

export async function getTenantRequest(
  requestID: string,
  signal?: AbortSignal,
): Promise<TenantRequestDetail> {
  const request = await apiRequest<BackendTenantRequestDetail>(
    ENDPOINTS.user.request(requestID),
    { auth: 'user', signal },
  )
  const details = request.details ?? {}

  return {
    ...mapTenantRequest(request),
    roomCode: request.roomCode ?? '',
    consumption:
      details.reading === undefined
        ? null
        : {
            meterImage: toAbsoluteAssetUrl(details.image ?? ''),
            reading: details.reading,
            capturedAt: details.capturedAt ?? request.createDate,
          },
    invoice: details.invoiceID
      ? {
          invoiceID: details.invoiceID,
          displayID: details.invoiceDisplayID ?? details.invoiceID,
        }
      : null,
    contract: details.contractID
      ? {
          displayID: details.contractDisplayID ?? details.contractID,
          requestedMoveoutDate: details.requestMoveoutDate ?? null,
        }
      : null,
    checkout:
      details.finalReading === undefined
        ? null
        : {
            meterImage: toAbsoluteAssetUrl(details.finalImage ?? ''),
            finalReading: details.finalReading,
          },
  }
}

export async function submitExtendRequest(
  signal?: AbortSignal,
): Promise<TenantExtendRequest> {
  const request = await apiRequest<BackendExtendRequest>(
    ENDPOINTS.user.extendRequests,
    { auth: 'user', method: 'POST', signal },
  )

  return {
    requestID: request.requestID,
    displayID: request.displayID ?? request.requestID,
    contractID: request.contractID ?? '',
    yearToExtend: request.yearToExtend,
    createDate: request.createDate,
    status: mapRequestStatus(request.status),
  }
}

/** `requestMoveoutDate` is a calendar date, sent as the plain YYYY-MM-DD the tenant picked. */
export async function submitMoveoutRequest(
  requestMoveoutDate: string,
  signal?: AbortSignal,
): Promise<TenantMoveoutRequest> {
  const request = await apiRequest<BackendMoveoutRequest>(
    ENDPOINTS.user.moveoutRequests,
    {
      auth: 'user',
      method: 'POST',
      body: JSON.stringify({ requestMoveoutDate }),
      signal,
    },
  )

  return {
    requestID: request.requestID,
    displayID: request.displayID ?? request.requestID,
    contractID: request.contractID ?? '',
    requestMoveoutDate: request.requestMoveoutDate,
    createDate: request.createDate,
    status: mapRequestStatus(request.status),
  }
}

function mapTenantRequest(request: BackendTenantRequest): TenantRequest {
  return {
    requestID: request.requestID,
    displayID: request.displayID ?? request.requestID,
    type: mapRequestType(request.type),
    createDate: request.createDate,
    resolveDate: request.resolveDate ?? null,
    status: mapRequestStatus(request.status),
  }
}

function toAbsoluteAssetUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path

  const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin
  return new URL(path, `${apiOrigin}/`).toString()
}
