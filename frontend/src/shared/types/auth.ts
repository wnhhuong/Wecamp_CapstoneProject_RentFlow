export type AccountRole = 'admin' | 'user'

export interface AuthAccount {
  accountID: string
  roomID: string | null
  username: string
  role: AccountRole
  status: string
}

/** Raw payload returned by POST /auth/login. */
export interface LoginResult {
  requireFirstLogin: boolean
  onboardingToken: string | null
  accessToken: string | null
  account: AuthAccount
  user: Record<string, unknown> | null
}

/** Normalized session persisted by the auth store. */
export interface AuthSession {
  accessToken: string | null
  onboardingToken: string | null
  requireFirstLogin: boolean
  account: AuthAccount
}