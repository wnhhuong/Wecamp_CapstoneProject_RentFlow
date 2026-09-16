import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ROUTES } from '@/router/routes'
import { login } from '@/shared/api/auth/login.api'
import { useAuth } from '@/shared/auth/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {isAuthenticated, account, signIn } = useAuth()
  const busy = useRef(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  // Already signed in: bounce to the workspace instead of showing the form.
  if (isAuthenticated && account) {
    const from = (location.state as { from?: string } | null)?.from
    return (
      <Navigate
        to={
          from ??
          (account.role === 'admin'
            ? ROUTES.admin.dashboard
            : ROUTES.user.dashboard)
        }
        replace
      />
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    if (!username.trim() || !password) {
      setError('Please enter a username and password.')
      return
    }
    busy.current = true
    setPending(true)
    setError('')
    try {
      const result = await login(username.trim(), password)
      signIn(result)
      setPassword('')
      navigate(
        result.requireFirstLogin
          ? ROUTES.auth.firstLoginProfile
          : result.account.role === 'admin'
            ? ROUTES.admin.dashboard
            : ROUTES.user.dashboard,
        { replace: true },
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot log in. Please try again.')
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  return (
    <section className="min-h-[calc(100svh-72px)] bg-surface pb-12" aria-labelledby="login-title">
      <div className="border-b border-hairline bg-white/60 px-5 py-8 text-center sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">RentFlow</p>
        <h2 className="mt-3 text-xl font-medium uppercase tracking-wide text-clay sm:text-3xl">Resident portal</h2>
      </div>
      <div className="h-8 border-b border-hairline bg-page/60" />
      <div className="px-5 pt-10 sm:pt-12">
        <div className="mx-auto w-full max-w-[420px] border border-hairline bg-white/70 p-5 sm:p-6">
          <h1 id="login-title" className="border-b border-hairline pb-5 text-center text-3xl font-normal uppercase tracking-wide text-clay">Login</h1>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit} aria-busy={pending}>
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium">Username</label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={pending}
                value={username}
                onChange={e => {
                  setUsername(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Enter username"
                className="h-12 rounded-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={pending}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Enter password"
                  className="h-12 rounded-sm pr-16"
                />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-1 rounded px-3 text-xs font-medium text-clay focus-visible:outline-2 focus-visible:outline-clay">{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            {error && <p role="alert" className="rounded border border-destructive/20 bg-status-danger-bg p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending} className="mt-2 h-12 w-full rounded-sm text-base">{pending ? 'Logging in…' : 'Login'}<span aria-hidden="true">→</span></Button>
            <Button type="button" variant="secondary" className="h-10 w-full rounded-sm" aria-expanded={showHelp} aria-controls="password-help" onClick={() => setShowHelp(v => !v)}>Forget password?</Button>
            {showHelp && <p id="password-help" role="status" className="border-l-2 border-clay pl-3 text-sm leading-6 text-body">Please contact the room manager to reset your password. Then use the new password to log in.</p>}
          </form>
        </div>
        <aside className="mx-auto mt-10 max-w-3xl rounded-lg border border-hairline bg-page/60 p-6 sm:px-8" aria-labelledby="login-guide">
          <h2 id="login-guide" className="text-lg font-medium uppercase text-clay">Login Guide</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-body">
            <li><strong>Username:</strong> Use the account provided by the room manager.</li>
            <li><strong>Password:</strong> Enter the correct password, distinguishing between uppercase and lowercase letters.</li>
            <li><strong>First-time Login:</strong> You will be directed to complete your personal information and sign a contract.</li>
          </ul>
          <p className="mt-4 border-t border-hairline pt-4 text-xs leading-5 text-muted-foreground">If you don't have an account or need assistance, please contact the room manager.</p>
        </aside>
      </div>
    </section>
  )
}
