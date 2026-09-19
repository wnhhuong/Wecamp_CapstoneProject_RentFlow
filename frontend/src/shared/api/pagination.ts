import type { ApiPagination, BackendPagination } from '@/shared/types/api'

/** Renames the backend's `total` to `totalItems` and fills in a missing block. */
export function toApiPagination(
  pagination: BackendPagination | undefined,
  fallback: { limit: number; totalItems: number },
): ApiPagination {
  return {
    page: pagination?.page ?? 1,
    limit: pagination?.limit ?? fallback.limit,
    totalItems: pagination?.total ?? fallback.totalItems,
    totalPages: pagination?.totalPages ?? 1,
  }
}
