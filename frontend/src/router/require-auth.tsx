import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { ROUTES } from '@/router/routes'
import { useAuth } from '@/shared/auth/useAuth'
import type { AccountRole } from '@/shared/types/auth'

interface RequireAuthProps {
  role?: AccountRole
  children: ReactNode
}

export function RequireAuth({ role, children }: RequireAuthProps) {
  const { session, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated || !session) {
    return (
      <Navigate
        to={ROUTES.auth.login}
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  if (session.requireFirstLogin) {
    return <Navigate to={ROUTES.auth.firstLoginProfile} replace />
  }

  if (role && session.account.role !== role) {
    return (
      <Navigate
        to={
          session.account.role === 'admin'
            ? ROUTES.admin.dashboard
            : ROUTES.user.dashboard
        }
        replace
      />
    )
  }

  return <>{children}</>
}