export interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string | null
}

/** Pagination as the UI reads it. */
export interface ApiPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

/**
 * Pagination as the backend sends it: `buildPaginationMeta` names the row count
 * `total`. Admin rooms is the one endpoint that renames it to `totalItems`
 * itself, so that response is typed `ApiPagination` directly.
 */
export interface BackendPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}
