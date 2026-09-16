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