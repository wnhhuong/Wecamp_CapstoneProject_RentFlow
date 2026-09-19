import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { AdminDashboardSummary } from '@/shared/types/admin/dashboard'
import { REQUEST_TYPE_LABELS, mapRequestType } from '@/shared/utils/requestTypes'

export function getAdminDashboard(signal?: AbortSignal) {
  return apiRequest<AdminDashboardSummary>(ENDPOINTS.admin.dashboard, { auth: 'admin', signal }).then((data) => ({
    ...data,
    requestsNeedingApproval: data.requestsNeedingApproval.map((request) => ({
      ...request,
      type: mapRequestType(request.type),
      typeLabel: REQUEST_TYPE_LABELS[mapRequestType(request.type)],
    })),
  }))
}
