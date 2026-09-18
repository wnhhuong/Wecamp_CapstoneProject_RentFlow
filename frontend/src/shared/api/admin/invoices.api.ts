import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  AdminInvoice,
  AdminInvoiceDetail,
  AdminInvoiceList,
  AdminInvoiceQuery,
  AdminInvoiceSummary,
} from '@/shared/types/admin/invoice'
import type { ApiPagination } from '@/shared/types/api'
import type { InvoiceBreakdown } from '@/shared/types/invoice'
import { mapInvoiceStatus } from '@/shared/utils/statusMapper'

interface BackendAdminInvoice {
  invoiceID: string | number
  displayID?: string | null
  tenantName?: string | null
  roomCode?: string | null
  billingPeriod?: string | null
  createDate: string
  dueDate: string
  totalBill: number
  received?: number
  stillOwed?: number
  status?: string
  isOverdue?: boolean
  isRequestLate?: boolean
}

/** The backend calls the row count `total`; the shared UI type calls it `totalItems`. */
interface BackendPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface BackendAdminInvoiceList {
  items?: BackendAdminInvoice[]
  billingPeriods?: string[]
  summary?: AdminInvoiceSummary
  pagination?: BackendPagination
}

interface BackendAdminInvoiceDetail extends BackendAdminInvoice {
  room?: { roomID: string | number; roomCode: string } | null
  tenant?: { userID: string | number; fullName: string } | null
  paymentDate?: string | null
  meterReading?: number
  usageKwh?: number
  electricityUnitPrice?: number
  electricityUnitPriceIsApprox?: boolean
  breakdown: Partial<InvoiceBreakdown>
}

const DEFAULT_LIMIT = 50

export async function getAdminInvoices(
  query: AdminInvoiceQuery = {},
  signal?: AbortSignal,
): Promise<AdminInvoiceList> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.isRequestLate !== undefined) {
    params.set('isRequestLate', String(query.isRequestLate))
  }
  if (query.billingPeriod) params.set('billingPeriod', query.billingPeriod)
  params.set('page', String(query.page ?? 1))
  params.set('limit', String(query.limit ?? DEFAULT_LIMIT))

  const response = await apiRequest<BackendAdminInvoiceList>(
    `${ENDPOINTS.admin.invoices}?${params.toString()}`,
    { auth: 'admin', signal },
  )

  return {
    items: (response.items ?? []).map(mapInvoice),
    billingPeriods: response.billingPeriods ?? [],
    summary: response.summary ?? {
      billingPeriod: null,
      billed: 0,
      received: 0,
      stillOwed: 0,
    },
    pagination: mapPagination(response, query.limit ?? DEFAULT_LIMIT),
  }
}

export async function getAdminInvoice(
  invoiceID: string,
  signal?: AbortSignal,
): Promise<AdminInvoiceDetail> {
  const detail = await apiRequest<BackendAdminInvoiceDetail>(
    ENDPOINTS.admin.invoice(invoiceID),
    { auth: 'admin', signal },
  )

  const base = mapInvoice({
    ...detail,
    roomCode: detail.room?.roomCode ?? detail.roomCode,
    tenantName: detail.tenant?.fullName ?? detail.tenantName,
  })

  return {
    ...base,
    roomID: String(detail.room?.roomID ?? ''),
    paymentDate: detail.paymentDate ?? null,
    meterReading: detail.meterReading ?? null,
    usageKwh: detail.usageKwh ?? null,
    unitPrice: detail.electricityUnitPrice ?? null,
    unitPriceIsApprox: detail.electricityUnitPriceIsApprox ?? false,
    breakdown: {
      room: detail.breakdown.room ?? 0,
      electrical: detail.breakdown.electrical ?? 0,
      water: detail.breakdown.water ?? 0,
      wifi: detail.breakdown.wifi ?? 0,
      parking: detail.breakdown.parking ?? 0,
      other: detail.breakdown.other ?? 0,
    },
  }
}

function mapPagination(
  response: BackendAdminInvoiceList,
  limit: number,
): ApiPagination {
  const items = response.items?.length ?? 0
  const pagination = response.pagination

  return {
    page: pagination?.page ?? 1,
    limit: pagination?.limit ?? limit,
    totalItems: pagination?.total ?? items,
    totalPages: pagination?.totalPages ?? 1,
  }
}

function mapInvoice(invoice: BackendAdminInvoice): AdminInvoice {
  const invoiceID = String(invoice.invoiceID)
  const received = invoice.received ?? 0

  return {
    invoiceID,
    displayID: invoice.displayID ?? invoiceID,
    tenantName: invoice.tenantName ?? '',
    roomCode: invoice.roomCode ?? '',
    billingPeriod: invoice.billingPeriod ?? '',
    createDate: invoice.createDate,
    dueDate: invoice.dueDate,
    totalBill: invoice.totalBill,
    received,
    stillOwed: invoice.stillOwed ?? invoice.totalBill - received,
    status: mapInvoiceStatus(invoice.status),
    isOverdue: invoice.isOverdue ?? false,
    isRequestLate: invoice.isRequestLate ?? false,
  }
}
