import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  BackendInvoiceRequest,
  BackendTenantInvoice,
  BackendTenantInvoiceDetail,
  BackendTenantInvoiceList,
  InvoiceBreakdown,
  TenantInvoice,
  TenantInvoiceDetail,
  TenantInvoiceRequest,
} from '@/shared/types/invoice'
import { mapInvoiceStatus, mapRequestStatus } from '@/shared/utils/statusMapper'

/**
 * A tenant has about twelve invoices a year, so the list is loaded once and
 * filtered in the page instead of round-tripping for every filter change.
 */
const INVOICES_PAGE_SIZE = 100

export async function getTenantInvoices(
  signal?: AbortSignal,
): Promise<TenantInvoice[]> {
  const searchParams = new URLSearchParams({
    page: '1',
    limit: String(INVOICES_PAGE_SIZE),
  })

  const response = await apiRequest<BackendTenantInvoiceList>(
    `${ENDPOINTS.user.invoices}?${searchParams.toString()}`,
    { auth: 'user', signal },
  )

  return response.items.map(mapTenantInvoice)
}

export async function getTenantInvoice(
  invoiceID: string,
  signal?: AbortSignal,
): Promise<TenantInvoiceDetail> {
  const invoice = await apiRequest<BackendTenantInvoiceDetail>(
    ENDPOINTS.user.invoice(invoiceID),
    { auth: 'user', signal },
  )

  return {
    // The detail endpoint puts the display code in invoiceID.
    displayID: invoice.invoiceID,
    roomCode: invoice.roomCode,
    createDate: invoice.createDate,
    billingMonth: invoice.billingMonth ?? null,
    paymentDate: invoice.paymentDate ?? null,
    dueDate: invoice.dueDate,
    status: mapInvoiceStatus(invoice.status),
    isOverdue: invoice.isOverdue ?? false,
    isRequestLate: invoice.isRequestLate ?? false,
    meterReading: invoice.meterReading ?? null,
    lastReading: invoice.lastReading ?? null,
    usage: toUsage(invoice.usage),
    // The backend sends 0 when it cannot derive the price from the invoice.
    unitPrice: invoice.unitPrice ? invoice.unitPrice : null,
    breakdown: mapBreakdown(invoice.breakdown),
    totalBill: invoice.totalBill,
  }
}

/** Only a non-negative reading difference is a usable kWh figure. */
function toUsage(usage: number | undefined): number | null {
  return usage === undefined || usage < 0 ? null : usage
}

export async function submitPaidRequest(
  invoiceID: string,
  signal?: AbortSignal,
): Promise<TenantInvoiceRequest> {
  return postInvoiceRequest(
    ENDPOINTS.user.invoicePaidRequest(invoiceID),
    signal,
  )
}

export async function submitLatePaymentRequest(
  invoiceID: string,
  signal?: AbortSignal,
): Promise<TenantInvoiceRequest> {
  return postInvoiceRequest(
    ENDPOINTS.user.invoiceLatePaymentRequest(invoiceID),
    signal,
  )
}

async function postInvoiceRequest(
  path: string,
  signal?: AbortSignal,
): Promise<TenantInvoiceRequest> {
  const request = await apiRequest<BackendInvoiceRequest>(path, {
    auth: 'user',
    method: 'POST',
    signal,
  })

  return {
    requestID: request.requestID,
    createDate: request.createDate,
    status: mapRequestStatus(request.status),
    invoiceID: request.invoiceID,
  }
}

function mapTenantInvoice(invoice: BackendTenantInvoice): TenantInvoice {
  return {
    invoiceID: invoice.invoiceID,
    displayID: invoice.displayID ?? invoice.invoiceID,
    roomCode: invoice.roomCode ?? '',
    createDate: invoice.createDate,
    billingMonth: invoice.billingMonth ?? null,
    dueDate: invoice.dueDate,
    totalBill: invoice.totalBill,
    status: mapInvoiceStatus(invoice.status),
    isOverdue: invoice.isOverdue ?? false,
    isRequestLate: invoice.isRequestLate ?? false,
  }
}

function mapBreakdown(
  breakdown: Partial<InvoiceBreakdown> = {},
): InvoiceBreakdown {
  return {
    room: breakdown.room ?? 0,
    electrical: breakdown.electrical ?? 0,
    water: breakdown.water ?? 0,
    wifi: breakdown.wifi ?? 0,
    parking: breakdown.parking ?? 0,
    other: breakdown.other ?? 0,
  }
}
