import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import { toApiPagination } from '@/shared/api/pagination'
import type {
  AdminTicket,
  AdminTicketList,
  AdminTicketQuery,
  BackendAdminTicket,
  BackendAdminTicketListResponse,
  BackendTicketStatusUpdate,
} from '@/shared/types/admin/ticket'
import type { TicketStatus } from '@/shared/types/status'
import { toAbsoluteAssetUrl } from '@/shared/utils/assetUrl'
import { mapTicketStatus } from '@/shared/utils/statusMapper'
import { mapTicketType } from '@/shared/utils/ticketTypes'

const DEFAULT_LIMIT = 20

export async function getAdminTickets(
  query: AdminTicketQuery = {},
  signal?: AbortSignal,
): Promise<AdminTicketList> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.type) params.set('type', query.type)
  if (query.status) params.set('status', query.status)
  params.set('page', String(query.page ?? 1))
  params.set('limit', String(query.limit ?? DEFAULT_LIMIT))

  const response = await apiRequest<BackendAdminTicketListResponse>(
    `${ENDPOINTS.admin.tickets}?${params.toString()}`,
    { auth: 'admin', signal },
  )

  const items = (response.items ?? []).map(mapTicket)

  return {
    items,
    pagination: toApiPagination(response.pagination, {
      limit: query.limit ?? DEFAULT_LIMIT,
      totalItems: items.length,
    }),
  }
}

/**
 * BE only accepts the next step of need_action → in_progress → done
 */
export async function advanceTicketStatus(
  ticket: AdminTicket,
): Promise<AdminTicket> {
  const next = NEXT_STATUS[ticket.status]
  if (!next) return ticket

  const updated = await apiRequest<BackendTicketStatusUpdate>(
    ENDPOINTS.admin.ticketStatus(ticket.ticketID),
    { auth: 'admin', method: 'PATCH', body: JSON.stringify({ status: next }) },
  )

  return {
    ...ticket,
    status: mapTicketStatus(updated.status),
    resolveDate: updated.resolveDate ?? null,
  }
}

export const NEXT_STATUS: Record<TicketStatus, TicketStatus | null> = {
  need_action: 'in_progress',
  in_progress: 'done',
  done: null,
}

function mapTicket(ticket: BackendAdminTicket): AdminTicket {
  const ticketID = String(ticket.ticketID)

  return {
    ticketID,
    displayID: ticket.displayID ?? ticketID,
    type: mapTicketType(ticket.ticketType),
    description: ticket.description ?? '',
    location: ticket.location ?? '',
    image: toAbsoluteAssetUrl(ticket.image ?? ''),
    roomID: ticket.roomID ? String(ticket.roomID) : '',
    roomCode: ticket.roomCode ?? '',
    createDate: ticket.createDate,
    resolveDate: ticket.resolveDate ?? null,
    status: mapTicketStatus(ticket.status),
  }
}

export { DEFAULT_LIMIT as ADMIN_TICKETS_PAGE_SIZE }
