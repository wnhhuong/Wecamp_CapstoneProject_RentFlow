import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  BackendTenantInvoice,
  BackendTenantInvoiceDetail,
  BackendTenantInvoiceList,
  InvoiceBreakdown,
  TenantInvoice,
  TenantInvoiceDetail,
} from '@/shared/types/invoice'
import { mapInvoiceStatus } from '@/shared/utils/statusMapper'

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
    paymentDate: invoice.paymentDate ?? null,
    dueDate: invoice.dueDate,
    status: mapInvoiceStatus(invoice.status),
    isOverdue: invoice.isOverdue ?? false,
    isRequestLate: invoice.isRequestLate ?? false,
    meterReading: invoice.meterReading ?? null,
    breakdown: mapBreakdown(invoice.breakdown),
    totalBill: invoice.totalBill,
  }
}

function mapTenantInvoice(invoice: BackendTenantInvoice): TenantInvoice {
  return {
    invoiceID: invoice.invoiceID,
    displayID: invoice.displayID ?? invoice.invoiceID,
    roomCode: invoice.roomCode ?? '',
    createDate: invoice.createDate,
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
