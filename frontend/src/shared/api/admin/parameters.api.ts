export type ParameterName =
  | 'electricityUnitPrice'
  | 'waterPrice'
  | 'wifiFee'
  | 'parkingFee'
  | 'otherFees'
  | 'meterReadingStartDay'
  | 'meterReadingEndDay'
  | 'paymentDueDay'
  | 'yearToExtend'

export interface AdminParameter {
  id: string
  name: ParameterName
  value: string
}

interface BackendParameter {
  id: string
  name: string
  value: string
}

interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string | null
}

interface LoginResponse {
  accessToken: string | null
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:5000/api'

const ACCESS_TOKEN_KEY = 'rentflow_access_token'

const allowedParameterNames = new Set<ParameterName>([
  'electricityUnitPrice',
  'waterPrice',
  'wifiFee',
  'parkingFee',
  'otherFees',
  'meterReadingStartDay',
  'meterReadingEndDay',
  'paymentDueDay',
  'yearToExtend',
])

export async function getAdminParameters(): Promise<AdminParameter[]> {
  const parameters = await apiRequest<BackendParameter[]>('/admin/parameters')

  return parameters
    .filter((parameter): parameter is AdminParameter =>
      allowedParameterNames.has(parameter.name as ParameterName),
    )
    .map((parameter) => ({
      id: parameter.id,
      name: parameter.name,
      value: parameter.value,
    }))
}

export async function updateAdminParameter(
  parameterID: string,
  value: string,
): Promise<AdminParameter> {
  const parameter = await apiRequest<BackendParameter>(
    `/admin/parameters/${parameterID}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value }),
    },
  )

  if (!allowedParameterNames.has(parameter.name as ParameterName)) {
    throw new Error('The updated parameter is not allowed in this flow.')
  }

  return {
    id: parameter.id,
    name: parameter.name as ParameterName,
    value: parameter.value,
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  canRetry = true,
): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(options.headers)

  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | { message?: string }
    | null

  if (response.status === 401 && canRetry) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    return apiRequest<T>(path, options, false)
  }

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : 'The request could not be completed.'
    throw new Error(message)
  }

  if (!payload || !('success' in payload) || !payload.success) {
    throw new Error('The backend returned an invalid response.')
  }

  return payload.data as T
}

async function getAccessToken() {
  const storedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY)
  if (storedToken) return storedToken

  const token = await loginWithSeedAdmin()
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
  return token
}

async function loginWithSeedAdmin() {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: import.meta.env.VITE_DEV_ADMIN_USERNAME ?? 'admin',
      password: import.meta.env.VITE_DEV_ADMIN_PASSWORD ?? 'Admin@123',
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<LoginResponse>
    | { message?: string }
    | null

  if (!response.ok || !payload || !('success' in payload) || !payload.success) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : 'Admin login failed.'
    throw new Error(message)
  }

  if (!payload.data?.accessToken) {
    throw new Error('Admin login did not return an access token.')
  }

  return payload.data.accessToken
}
