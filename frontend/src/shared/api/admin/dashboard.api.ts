import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  AdminDashboardSummary,
  BackendAdminDashboardSummary,
} from '@/shared/types/admin/dashboard'
import { REQUEST_TYPE_LABELS, mapRequestType } from '@/shared/utils/requestTypes'
import { TICKET_TYPE_LABELS, mapTicketType } from '@/shared/utils/ticketTypes'

export function getAdminDashboard(
  signal?: AbortSignal,
): Promise<AdminDashboardSummary> {
  return apiRequest<BackendAdminDashboardSummary>(ENDPOINTS.admin.dashboard, {
    auth: 'admin',
    signal,
  }).then((data) => ({
    ...data,
    requestsNeedingApproval: data.requestsNeedingApproval.map((request) => ({
      ...request,
      type: mapRequestType(request.type),
      typeLabel: REQUEST_TYPE_LABELS[mapRequestType(request.type)],
    })),
    ticketsNeedingAction: data.ticketsNeedingAction.map((ticket) => ({
      ...ticket,
      type: mapTicketType(ticket.type),
      typeLabel: TICKET_TYPE_LABELS[mapTicketType(ticket.type)],
    })),
  }))
}
