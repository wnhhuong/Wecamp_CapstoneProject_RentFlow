/**
 * Scope documents which role an endpoint requires. A signed-in session holds
 * exactly one token, so every protected scope resolves through the same reader.
 */
export type ProtectedApiScope = 'admin' | 'user'
export type ApiScope = 'guest' | ProtectedApiScope

type AccessTokenReader = (
  scope: ProtectedApiScope,
) => string | null | Promise<string | null>

type UnauthorizedHandler = (
  scope: ProtectedApiScope,
) => void

interface ApiAuthConfiguration {
  readAccessToken: AccessTokenReader
  onUnauthorized?: UnauthorizedHandler
}

const defaultReader: AccessTokenReader = () => null

let readAccessToken: AccessTokenReader = defaultReader
let handleUnauthorized: UnauthorizedHandler = () => {}

/** Connects the API client to the application's auth state. */
export function configureApiAuth({
  readAccessToken: tokenReader,
  onUnauthorized,
}: ApiAuthConfiguration) {
  readAccessToken = tokenReader

  if (onUnauthorized) {
    handleUnauthorized = onUnauthorized
  }
}

export function getAccessToken(scope: ProtectedApiScope) {
  if (import.meta.env.DEV && readAccessToken === defaultReader) {
    console.warn('configureApiAuth has not run; protected requests are anonymous.')
  }
  return readAccessToken(scope)
}

export function reportUnauthorized(scope: ProtectedApiScope) {
  handleUnauthorized(scope)
}