import { useSyncExternalStore } from 'react'

import {
  getAuthSession,
  signIn,
  signOut,
  subscribeToAuth,
} from '@/shared/auth/auth-store'

export function useAuth() {
  const session = useSyncExternalStore(
    subscribeToAuth,
    getAuthSession,
    getAuthSession,
  )

  return {
    session,
    account: session?.account ?? null,
    isAuthenticated: Boolean(session?.accessToken),
    requireFirstLogin: session?.requireFirstLogin ?? false,
    signIn,
    signOut,
  }
}