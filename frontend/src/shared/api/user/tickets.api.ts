import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { BackendPagination } from '@/shared/types/api'
import type {
  BackendTenantTicket,
  BackendTenantTicketListResponse,
  TenantTicket,
  TenantTicketList,
  TenantTicketQuery,
} from '@/shared/types/ticket'
import { mapTicketStatus } from '@/shared/utils/statusMapper'
import { mapTicketType } from '@/shared/utils/ticketTypes'

const DEFAULT_LIMIT = 20

export async function getTenantTickets(
  query: TenantTicketQuery = {},
  signal?: AbortSignal,
): Promise<TenantTicketList> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.type) params.set('type', query.type)
  if (query.status) params.set('status', query.status)
  params.set('page', String(query.page ?? 1))
  params.set('limit', String(query.limit ?? DEFAULT_LIMIT))

  const response = await apiRequest<
    BackendTenantTicketListResponse & { pagination?: BackendPagination }
  >(`${ENDPOINTS.user.tickets}?${params.toString()}`, { auth: 'user', signal })

  const items = (response.items ?? []).map(mapTicket)

  return {
    items,
    pagination: {
      page: response.pagination?.page ?? 1,
      limit: response.pagination?.limit ?? query.limit ?? DEFAULT_LIMIT,
      totalItems: response.pagination?.total ?? items.length,
      totalPages: response.pagination?.totalPages ?? 1,
    },
  }
}

function mapTicket(ticket: BackendTenantTicket): TenantTicket {
  const ticketID = String(ticket.ticketID)

  return {
    ticketID,
    displayID: ticket.displayID ?? ticketID,
    type: mapTicketType(ticket.ticketType),
    description: ticket.description ?? '',
    location: ticket.location ?? '',
    createDate: ticket.createDate,
    resolveDate: ticket.resolveDate ?? null,
    status: mapTicketStatus(ticket.status),
  }
}

export { DEFAULT_LIMIT as TICKETS_PAGE_SIZE }
