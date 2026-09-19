import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  AdminUser,
  AdminUserList,
  AdminUserQuery,
  BackendAdminUser,
  BackendAdminUserListResponse,
} from '@/shared/types/admin/user'
import type { BackendPagination } from '@/shared/types/api'
import { mapSex } from '@/shared/utils/sexLabels'
import { mapContractStatus } from '@/shared/utils/statusMapper'

const DEFAULT_LIMIT = 20

export async function getAdminUsers(
  query: AdminUserQuery = {},
  signal?: AbortSignal,
): Promise<AdminUserList> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.lease) params.set('lease', query.lease)
  params.set('page', String(query.page ?? 1))
  params.set('limit', String(query.limit ?? DEFAULT_LIMIT))

  const response = await apiRequest<
    BackendAdminUserListResponse & { pagination?: BackendPagination }
  >(`${ENDPOINTS.admin.users}?${params.toString()}`, { auth: 'admin', signal })

  const items = (response.items ?? []).map(mapUser)

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

function mapUser(user: BackendAdminUser): AdminUser {
  return {
    userID: String(user.userID),
    fullName: user.fullName,
    dob: user.dob ?? null,
    phoneNumber: user.phoneNumber ?? '',
    identityNo: user.identityNo ?? '',
    sex: mapSex(user.sex),
    nationality: user.nationality ?? '',
    placeOfResidence: user.por ?? '',
    roomCode: user.roomCode ?? null,
    contractStatus: user.contractStatus
      ? mapContractStatus(user.contractStatus)
      : null,
  }
}

export { DEFAULT_LIMIT as USERS_PAGE_SIZE }
