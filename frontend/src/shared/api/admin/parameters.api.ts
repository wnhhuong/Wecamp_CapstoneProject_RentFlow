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
  const parameter = await updateAdminParameters([
    {
      parameterID,
      value,
    },
  ]).then((parameters) => parameters[0])

  if (!parameter) {
    throw new Error('The parameter could not be updated.')
  }

  return parameter
}

export async function updateAdminParameters(
  updates: Array<{ parameterID: string; value: string }>,
): Promise<AdminParameter[]> {
  const parameters = await apiRequest<BackendParameter[]>('/admin/parameters', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ updates }),
  })

  const blockedParameter = parameters.find(
    (parameter) => !allowedParameterNames.has(parameter.name as ParameterName),
  )
  if (blockedParameter) {
    throw new Error('One of the updated parameters is not allowed in this flow.')
  }

  return parameters.map((parameter) => ({
    id: parameter.id,
    name: parameter.name as ParameterName,
    value: parameter.value,
  }))
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
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

  if (response.status === 401) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    throw new Error('Your admin session expired. Please sign in again.')
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

  throw new Error('Please sign in as an admin before configuring parameters.')
}
