export interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string | null
}

export interface ApiPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}
export interface BackendPagination {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
}
