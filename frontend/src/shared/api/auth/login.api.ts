import { apiRequest } from '@/shared/api/config'
import { ENDPOINTS } from '@/shared/api/endpoints'

export interface LoginAccount {
  accountID: string
  roomID?: string | null
  username: string
  role: 'admin' | 'user'
  status: string
}

export interface LoginResult {
  requireFirstLogin: boolean
  onboardingToken: string | null
  accessToken: string | null

  account: LoginAccount

  user: Record<string, unknown> | null
}

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
  if (!result?.account || !['admin', 'user'].includes(result.account.role) ||
    typeof result.requireFirstLogin !== 'boolean' ||
    (result.requireFirstLogin ? !result.onboardingToken : !result.accessToken)) {
    throw new Error('Dữ liệu đăng nhập không hợp lệ. Vui lòng thử lại.')
  }
  return result
}
