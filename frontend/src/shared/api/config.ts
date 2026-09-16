// API base URL/environment configuration
// VITE_API_BASE_URL is accepted for existing local environments.
const rawBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL
export const API_BASE_URL = (rawBaseUrl || 'http://localhost:5000/api').trim().replace(/\/+$/, '')

export const AUTH_TOKEN_KEY = 'rentflow_access_token'
export const ONBOARDING_TOKEN_KEY = 'rentflow_onboarding_token'
export const AUTH_STORAGE_KEY = 'rentflow.auth'

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
      ...options,
      headers,
      signal: options.signal ?? AbortSignal.timeout(15000),
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra backend và thử lại.', { cause: error })
  }

  if (response.status === 204) {
    return null as T
  }

  const result = await response.json().catch(() => null)

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message ?? `Request failed (${response.status})`
    )
  }

  if (result === null) {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.')
  }

  const data = result && typeof result === 'object' && 'data' in result ? result.data : result
  return data as T
}
