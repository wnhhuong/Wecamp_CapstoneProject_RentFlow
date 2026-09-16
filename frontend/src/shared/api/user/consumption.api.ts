import { ApiError, apiRequest as request } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type {
  ConsumptionContext,
  ConsumptionRequest,
  SubmitConsumptionInput,
} from '@/shared/types/consumption'

// Temporary seed login, remove after auth
const ACCESS_TOKEN_KEY = 'rentflow_user_access_token'

export function getConsumptionContext(signal?: AbortSignal) {
  return apiRequest<ConsumptionContext>(
    ENDPOINTS.user.consumptionContext,
    { signal },
  )
}

export function getConsumptionRequest(
  requestID: ConsumptionRequest['requestID'],
  signal?: AbortSignal,
): Promise<ConsumptionRequest> {
  return apiRequest<ConsumptionRequest>(
    `${ENDPOINTS.user.consumptionRequests}/${encodeURIComponent(String(requestID))}`,
    { signal },
  )
}

export function submitConsumption(input: SubmitConsumptionInput) {
  const body = new FormData()

  body.append('image', input.image)
  body.append('reading', String(input.reading))
  body.append('capturedAt', input.capturedAt)

  return apiRequest<ConsumptionRequest>(
    ENDPOINTS.user.consumptionRequests,
    { method: 'POST', body },
  )
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  canRetry = true,
): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(options.headers)

  headers.set('Authorization', `Bearer ${token}`)

  try {
    return await request<T>(path, { ...options, headers })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && canRetry) {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      return apiRequest<T>(path, options, false)
    }

    throw error
  }
}

async function getAccessToken(): Promise<string> {
  const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (storedToken) return storedToken

  const data = await request<{ accessToken: string | null }>('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: import.meta.env.VITE_DEV_USER_USERNAME ?? 'A-101',
      password: import.meta.env.VITE_DEV_USER_PASSWORD ?? 'Tenant@123',
    }),
  })

  if (!data.accessToken) {
    throw new Error('Tenant login did not return an access token.')
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
  return data.accessToken
}
