import { apiRequest } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { LoginResult } from '@/shared/types/auth'

export async function login(
  username: string,
  password: string,
): Promise<LoginResult> {
  const result = await apiRequest<LoginResult>(
    ENDPOINTS.auth.login,
    {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
      }),
    },
  )
  const hasRequiredToken = result.requireFirstLogin
    ? Boolean(result.onboardingToken)
    : Boolean(result.accessToken)

  if (
    !result.account ||
    (result.account.role !== 'admin' && result.account.role !== 'user') ||
    typeof result.requireFirstLogin !== 'boolean' ||
    !hasRequiredToken
  ) {
    throw new Error('The login response was invalid. Please try again.')
  }

  return result
}
