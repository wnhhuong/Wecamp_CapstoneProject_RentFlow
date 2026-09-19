import type { ApiPagination } from '@/shared/types/api'
import type { ContractStatus } from '@/shared/types/contract'
import type { TenantSex } from '@/shared/types/profile'

export interface BackendAdminUserListResponse {
  items?: BackendAdminUser[]
}

export interface BackendAdminUser {
  userID: string | number
  fullName: string
  dob?: string | null
  phoneNumber?: string | null
  identityNo?: string | null
  sex?: string | null
  nationality?: string | null
  por?: string | null
  roomCode?: string | null
  contractID?: string | number | null
  contractStatus?: string | null
}

/** Matches the Lease column: `expired` also covers anyone who never signed one. */
export type UserLeaseFilter = 'active' | 'expired'

export interface AdminUser {
  userID: string
  fullName: string
  /** Calendar date, "YYYY-MM-DD". */
  dob: string | null
  phoneNumber: string
  identityNo: string
  sex: TenantSex
  nationality: string
  placeOfResidence: string
  /** The room of the live lease, or of the last one they signed. */
  roomCode: string | null
  contractStatus: ContractStatus | null
}

export interface AdminUserQuery {
  search?: string
  lease?: UserLeaseFilter
  page?: number
  limit?: number
}

export interface AdminUserList {
  items: AdminUser[]
  pagination: ApiPagination
}
