import { API_BASE_URL } from '@/shared/api/config'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { ApiResponse } from '@/shared/types/api'

const ACCESS_TOKEN_KEYS = {
  admin: 'rentflow_admin_access_token',
  user: 'rentflow_user_access_token',
} as const

const DEVELOPMENT_ACCOUNTS = {
  admin: {
    username: import.meta.env.VITE_DEV_ADMIN_USERNAME ?? 'admin',
    password: import.meta.env.VITE_DEV_ADMIN_PASSWORD ?? 'Admin@123',
  },
  user: {
    username: import.meta.env.VITE_DEV_USER_USERNAME ?? 'A-101',
    password: import.meta.env.VITE_DEV_USER_PASSWORD ?? 'Tenant@123',
  },
} as const

type ProtectedApiScope = keyof typeof ACCESS_TOKEN_KEYS
type ApiScope = 'guest' | ProtectedApiScope

type AccessTokenReader = (
  scope: ProtectedApiScope,
) => string | null | Promise<string | null>

type UnauthorizedHandler = (
  scope: ProtectedApiScope,
) => void

interface ApiAuthConfiguration {
  readAccessToken: AccessTokenReader
  onUnauthorized?: UnauthorizedHandler
}

interface LoginResponse {
  accessToken: string | null
}

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

const pendingLogins: Partial<
  Record<ProtectedApiScope, Promise<string>>
> = {}

/**
 * Temporary development adapter used while AuthContext/store is unavailable.
 *
 * Protected requests first reuse the token stored for their scope. If no token
 * exists during development, the adapter signs in with the configured seed
 * account and stores the returned token.
 *
 * When authentication is implemented, configureApiAuth will replace this
 * adapter without requiring changes in individual API modules.
 */
let readAccessToken: AccessTokenReader = getDevelopmentAccessToken

let handleUnauthorized: UnauthorizedHandler = (scope) => {
  window.localStorage.removeItem(ACCESS_TOKEN_KEYS[scope])
}

/**
 * Connects the shared API client to the application's auth state.
 * This function remains useful after AuthContext/store is implemented.
 */
export function configureApiAuth({
  readAccessToken: tokenReader,
  onUnauthorized,
}: ApiAuthConfiguration) {
  readAccessToken = tokenReader

  if (onUnauthorized) {
    handleUnauthorized = onUnauthorized
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

  if (auth !== 'guest' && !headers.has('Authorization')) {
    const token = await readAccessToken(auth)

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const payload: unknown = await response.json().catch(() => null)

  if (response.status === 401 && auth !== 'guest') {
    handleUnauthorized(auth)
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

async function getDevelopmentAccessToken(
  scope: ProtectedApiScope,
): Promise<string | null> {
  const storedToken = window.localStorage.getItem(
    ACCESS_TOKEN_KEYS[scope],
  )

  if (storedToken) {
    return storedToken
  }

  if (!import.meta.env.DEV) {
    return null
  }

  let loginPromise = pendingLogins[scope]

  if (!loginPromise) {
    loginPromise = loginWithDevelopmentAccount(scope)
    pendingLogins[scope] = loginPromise
  }

  try {
    const token = await loginPromise

    window.localStorage.setItem(
      ACCESS_TOKEN_KEYS[scope],
      token,
    )

    return token
  } finally {
    delete pendingLogins[scope]
  }
}

async function loginWithDevelopmentAccount(
  scope: ProtectedApiScope,
): Promise<string> {
  const credentials = DEVELOPMENT_ACCOUNTS[scope]

  const response = await fetch(
    `${API_BASE_URL}${ENDPOINTS.auth.login}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    },
  )

  const payload: unknown = await response.json().catch(() => null)

  if (
    !response.ok ||
    !isApiResponse<LoginResponse>(payload) ||
    !payload.success
  ) {
    throw new ApiError(
      getResponseMessage(payload) ??
        `${scope === 'admin' ? 'Admin' : 'Tenant'} login failed.`,
      response.status,
    )
  }

  if (!payload.data?.accessToken) {
    throw new ApiError(
      `${scope === 'admin' ? 'Admin' : 'Tenant'} login did not return an access token.`,
      response.status,
    )
  }

  return payload.data.accessToken
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