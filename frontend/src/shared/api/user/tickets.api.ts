import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import { toApiPagination } from '@/shared/api/pagination'
import type {
  BackendComplaintArea,
  BackendComplaintOptions,
  BackendCreatedTicket,
  BackendRepairFacility,
  BackendRepairOptions,
  BackendTenantTicket,
  BackendTenantTicketListResponse,
  ComplaintOptions,
  RepairFacilityOption,
  RepairOptions,
  SubmitComplaintInput,
  SubmitRepairInput,
  TenantTicket,
  TenantTicketList,
  TenantTicketQuery,
  TenantTicketReceipt,
} from '@/shared/types/ticket'
import { toAbsoluteAssetUrl } from '@/shared/utils/assetUrl'
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

  const response = await apiRequest<BackendTenantTicketListResponse>(
    `${ENDPOINTS.user.tickets}?${params.toString()}`,
    { auth: 'user', signal },
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

export async function getRepairOptions(
  signal?: AbortSignal,
): Promise<RepairOptions> {
  const options = await apiRequest<BackendRepairOptions>(
    ENDPOINTS.user.repairOptions,
    { auth: 'user', signal },
  )

  return {
    roomCode: options.roomCode ?? '',
    facilities: labelFacilities(options.facilities ?? []),
  }
}

export async function submitRepairTicket({
  facilityID,
  description,
  image,
}: SubmitRepairInput): Promise<TenantTicketReceipt> {
  const body = new FormData()
  body.append('facilityID', facilityID)
  body.append('description', description)
  body.append('image', image)

  const ticket = await apiRequest<BackendCreatedTicket>(
    ENDPOINTS.user.repairTickets,
    { auth: 'user', method: 'POST', body },
  )

  const ticketID = String(ticket.ticketID)

  return {
    ticketID,
    displayID: ticket.ticketName ?? ticketID,
    type: mapTicketType(ticket.type),
    description: ticket.description ?? description,
    createDate: ticket.createDate,
    status: mapTicketStatus(ticket.status),
  }
}

export async function getComplaintOptions(
  signal?: AbortSignal,
): Promise<ComplaintOptions> {
  const options = await apiRequest<BackendComplaintOptions>(
    ENDPOINTS.user.complaintOptions,
    { auth: 'user', signal },
  )

  return { areas: (options.areas ?? []).map(mapComplaintArea) }
}

export async function submitComplaintTicket({
  areaID,
  roomID,
  description,
}: SubmitComplaintInput): Promise<TenantTicketReceipt> {
  const ticket = await apiRequest<BackendCreatedTicket>(
    ENDPOINTS.user.complaintTickets,
    {
      auth: 'user',
      method: 'POST',
      body: JSON.stringify({
        areaID,
        description,
        ...(roomID ? { roomID } : {}),
      }),
    },
  )

  const ticketID = String(ticket.ticketID)

  return {
    ticketID,
    displayID: ticket.ticketName ?? ticketID,
    type: mapTicketType(ticket.type),
    description: ticket.description ?? description,
    createDate: ticket.createDate,
    status: mapTicketStatus(ticket.status),
  }
}

function mapComplaintArea(area: BackendComplaintArea) {
  const areaID = String(area.areaID)

  return {
    areaID,
    areaName: area.areaName ?? areaID,
    rooms: (area.rooms ?? []).map((room) => ({
      roomID: String(room.roomID),
      roomCode: room.roomCode ?? String(room.roomID),
    })),
  }
}

/**
 * A facility carries no name of its own, only its type, so two of the same type
 * in one room would read identically. Those get numbered; singles stay plain.
 */
function labelFacilities(
  facilities: BackendRepairFacility[],
): RepairFacilityOption[] {
  const seen = new Map<string, number>()
  for (const facility of facilities) {
    const typeName = facility.typeName ?? ''
    seen.set(typeName, (seen.get(typeName) ?? 0) + 1)
  }

  const used = new Map<string, number>()
  return facilities.map((facility) => {
    const typeName = facility.typeName ?? 'Facility'
    const total = seen.get(facility.typeName ?? '') ?? 1
    const position = (used.get(typeName) ?? 0) + 1
    used.set(typeName, position)

    return {
      facilityID: String(facility.facilityID),
      label: total > 1 ? `${typeName} ${position}` : typeName,
    }
  })
}

function mapTicket(ticket: BackendTenantTicket): TenantTicket {
  const ticketID = String(ticket.ticketID)

  return {
    ticketID,
    displayID: ticket.displayID ?? ticketID,
    type: mapTicketType(ticket.ticketType),
    description: ticket.description ?? '',
    location: ticket.location ?? '',
    image: toAbsoluteAssetUrl(ticket.image ?? ''),
    createDate: ticket.createDate,
    resolveDate: ticket.resolveDate ?? null,
    status: mapTicketStatus(ticket.status),
  }
}

export { DEFAULT_LIMIT as TICKETS_PAGE_SIZE }
