import {
  getAccessToken,
  reportUnauthorized,
  type ApiScope,
} from '@/shared/api/auth-adapter'
import { API_BASE_URL } from '@/shared/api/config'
import type { ApiResponse } from '@/shared/types/api'

export interface ApiRequestOptions extends RequestInit {
  auth?: ApiScope
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  {
    auth = 'guest',
    ...options
  }: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')

  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (auth !== 'guest' && !headers.has('Authorization')) {
    const token = await getAccessToken(auth)

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch (error) {
    if (options.signal?.aborted) throw error

    throw new ApiError(
      'Cannot reach the server. Check your connection and try again.',
      0,
    )
  }

  const payload: unknown = await response.json().catch(() => null)

  if (response.status === 401 && auth !== 'guest') {
    reportUnauthorized(auth)
  }

  if (!response.ok) {
    throw new ApiError(
      getResponseMessage(payload) ??
        `The request could not be completed (${response.status}).`,
      response.status,
    )
  }

  if (!isApiResponse<T>(payload) || !payload.success) {
    throw new ApiError(
      getResponseMessage(payload) ??
        'The backend returned an invalid response.',
      response.status,
    )
  }

  if (payload.data == null) {
    throw new ApiError(
      payload.message ?? 'The backend returned no data.',
      response.status,
    )
  }

  return payload.data
}

function isApiResponse<T>(
  value: unknown,
): value is ApiResponse<T> {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const response = value as Record<string, unknown>

  return (
    typeof response.success === 'boolean' &&
    'data' in response
  )
}

function getResponseMessage(
  value: unknown,
): string | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const message = (value as Record<string, unknown>).message

  return typeof message === 'string' && message.trim()
    ? message
    : null
}