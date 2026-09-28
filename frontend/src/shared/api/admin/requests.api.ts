import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  AdminCheckoutDetails,
  AdminConsumptionDetails,
  AdminExtensionDetails,
  AdminInvoiceDetails,
  AdminMoveoutDetails,
  AdminRequest,
  AdminRequestDetail,
  ApproveRequestResult,
  BackendApproveResponse,
  BackendRequestDetail,
  BackendRequestListItem,
  BackendRequestListResponse,
} from '@/shared/types/admin/request'
import { formatMonthYear } from '@/shared/utils/dateFormatter'
import { toAbsoluteAssetUrl } from '@/shared/utils/assetUrl'
import { mapRequestType } from '@/shared/utils/requestTypes'
import { mapInvoiceStatus, mapRequestStatus } from '@/shared/utils/statusMapper'

const REQUEST_PAGE_SIZE = 100

export async function getAdminRequests(): Promise<AdminRequest[]> {
  const response = await apiRequest<BackendRequestListResponse>(
    `${ENDPOINTS.admin.requests}?limit=${REQUEST_PAGE_SIZE}`,
    { auth: 'admin' },
  )

  return (response.items ?? []).map(mapRequest)
}

export async function getAdminRequest(
  requestID: string,
): Promise<AdminRequestDetail> {
  const detail = await apiRequest<BackendRequestDetail>(
    ENDPOINTS.admin.request(requestID),
    { auth: 'admin' },
  )
  return {
    ...mapRequest({
      ...detail,
      roomCode: detail.room?.roomCode ?? detail.roomCode,
      userFullName: detail.user?.fullName ?? detail.userFullName,
    }),
    roomID: detail.room ? String(detail.room.roomID) : '',
    consumption: mapConsumptionDetails(detail),
    extension: mapExtensionDetails(detail),
    moveout: mapMoveoutDetails(detail),
    checkout: mapCheckoutDetails(detail),
    invoice: mapInvoiceDetails(detail),
  }
}

export async function approveAdminRequest(
  requestID: string,
): Promise<ApproveRequestResult> {
  const approved = await apiRequest<BackendApproveResponse>(
    ENDPOINTS.admin.approveRequest(requestID),
    { auth: 'admin', method: 'PATCH' },
  )

  return {
    requestID: String(approved.requestID),
    type: mapRequestType(approved.type),
    status: mapRequestStatus(approved.status),
    resolveDate: approved.resolveDate,
  }
}

function mapRequest(request: BackendRequestListItem): AdminRequest {
  const requestID = String(request.requestID)

  return {
    requestID,
    displayID: request.displayID ?? requestID,
    type: mapRequestType(request.type),
    roomCode: request.roomCode ?? '',
    tenantName: request.userFullName ?? '',
    createDate: request.createDate,
    resolveDate: request.resolveDate ?? null,
    status: mapRequestStatus(request.status),
  }
}

function mapConsumptionDetails(
  detail: BackendRequestDetail,
): AdminConsumptionDetails | null {
  if (detail.type !== 'consump' || !detail.details) return null

  const details = detail.details
  const currentReading = details.currentReading ?? 0
  const previousReading = details.previousReading ?? 0
  const capturedAt = details.capturedAt ?? detail.createDate

  return {
    meterImage: toAbsoluteAssetUrl(details.image ?? ''),
    previousReading,
    currentReading,
    usage: details.usage ?? currentReading - previousReading,
    capturedAt,
    billingPeriod: formatMonthYear(capturedAt),
  }
}

function mapExtensionDetails(
  detail: BackendRequestDetail,
): AdminExtensionDetails | null {
  if (detail.type !== 'extend' || detail.details?.contractID === undefined) {
    return null
  }

  const details = detail.details

  return {
    contractDisplayID:
      details.contractDisplayID ?? String(details.contractID),
    expireDate: details.contractExpireDate ?? '',
    yearToExtend: details.yearToExtend ?? 1,
  }
}

function mapMoveoutDetails(
  detail: BackendRequestDetail,
): AdminMoveoutDetails | null {
  if (detail.type !== 'moveout' || detail.details?.contractID === undefined) {
    return null
  }

  const details = detail.details

  return {
    contractDisplayID: details.contractDisplayID ?? String(details.contractID),
    requestMoveoutDate: details.requestMoveoutDate ?? '',
  }
}

function mapCheckoutDetails(
  detail: BackendRequestDetail,
): AdminCheckoutDetails | null {
  if (detail.type !== 'checkout' || detail.details?.contractID === undefined) {
    return null
  }

  const details = detail.details
  const finalReading = details.finalReading ?? 0
  const previousReading = details.previousReading ?? 0

  return {
    contractDisplayID: details.contractDisplayID ?? String(details.contractID),
    expireDate: details.contractExpireDate ?? '',
    meterImage: toAbsoluteAssetUrl(details.finalImage ?? ''),
    previousReading,
    finalReading,
    usage: details.usage ?? finalReading - previousReading,
  }
}

function mapInvoiceDetails(
  detail: BackendRequestDetail,
): AdminInvoiceDetails | null {
  if (detail.details?.invoiceID === undefined) return null

  const details = detail.details
  const invoiceID = String(details.invoiceID)

  return {
    invoiceID,
    invoiceDisplayID: details.invoiceDisplayID ?? invoiceID,
    totalBill: details.invoiceTotalBill ?? 0,
    dueDate: details.invoiceDueDate ?? '',
    invoiceStatus: mapInvoiceStatus(details.invoiceStatus),
  }
}
