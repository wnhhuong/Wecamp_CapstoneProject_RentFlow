import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { ROUTES } from '@/router/routes'
import { useAuth } from '@/shared/auth/useAuth'

export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  if (!session?.requireFirstLogin || !session.onboardingToken) return <Navigate to={ROUTES.auth.login} replace />
  return <>{children}</>
}
