import { API_BASE_URL } from './config'

interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string | null
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let readAccessToken: () => string | null = () => null

export function configureApiAuth(reader: () => string | null) {
  readAccessToken = reader
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  const token = readAccessToken()

  headers.set('Accept', 'application/json')

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const body = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | null

  if (!response.ok || !body?.success || body.data == null) {
    throw new ApiError(
      body?.message ?? `Request failed (${response.status})`,
      response.status,
    )
  }

  return body.data
}