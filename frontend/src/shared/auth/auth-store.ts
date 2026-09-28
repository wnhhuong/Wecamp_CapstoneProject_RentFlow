import { configureApiAuth } from '@/shared/api/auth-adapter'
import type { AuthAccount, AuthSession, LoginResult } from '@/shared/types/auth'

/** Single source of truth for the persisted auth session. */
export const AUTH_STORAGE_KEY = 'rentflow.auth'

const listeners = new Set<() => void>()

let session: AuthSession | null = readStoredSession()

export function getAuthSession(): AuthSession | null {
  return session
}

export function subscribeToAuth(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function signIn(result: LoginResult) {
  publish({
    accessToken: result.accessToken,
    onboardingToken: result.onboardingToken,
    requireFirstLogin: result.requireFirstLogin,
    account: result.account,
    fullName: readFullName(result.user),
  })
}

function readFullName(user: LoginResult['user']): string | null {
  const fullName = user?.fullName

  return typeof fullName === 'string' && fullName.trim() ? fullName : null
}

export function signOut() {
  publish(null)
}

export function completeOnboarding(result: LoginResult) {
  publish({
    accessToken: result.accessToken,
    onboardingToken: null,
    requireFirstLogin: false,
    account: result.account,
    fullName: readFullName(result.user),
  })
}

export function updateOnboardingToken(onboardingToken: string) {
  if (!session) return
  publish({ ...session, onboardingToken, fullName: session.fullName })
}

function publish(next: AuthSession | null) {
  session = next

  if (next) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next))
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  notify()
}

function notify() {
  listeners.forEach((listener) => listener())
}

function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null

    return parseSession(JSON.parse(raw))
  } catch {
    return null
  }
}

function parseSession(value: unknown): AuthSession | null {
  if (typeof value !== 'object' || value === null) return null

  const candidate = value as Partial<AuthSession>
  const account = candidate.account as Partial<AuthAccount> | undefined

  if (
    !account ||
    typeof account.accountID !== 'string' ||
    typeof account.username !== 'string' ||
    (account.role !== 'admin' && account.role !== 'user')
  ) {
    return null
  }

  return {
    accessToken:
      typeof candidate.accessToken === 'string' ? candidate.accessToken : null,
    onboardingToken:
      typeof candidate.onboardingToken === 'string'
        ? candidate.onboardingToken
        : null,
    requireFirstLogin: candidate.requireFirstLogin === true,
    fullName:
      typeof candidate.fullName === 'string' ? candidate.fullName : null,
    account: {
      accountID: account.accountID,
      roomID: typeof account.roomID === 'string' ? account.roomID : null,
      username: account.username,
      role: account.role,
      status: typeof account.status === 'string' ? account.status : '',
    },
  }
}

// Keep tabs in sync without writing back to storage (avoids a write ping-pong).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== AUTH_STORAGE_KEY) return

    session = event.newValue ? parseSession(safeParse(event.newValue)) : null
    notify()
  })
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

configureApiAuth({
  readAccessToken: (scope) =>
    scope === 'onboarding'
      ? session?.onboardingToken ?? null
      : session?.accessToken ?? null,
  onUnauthorized: () => {
    if (session) signOut()
  },
})
