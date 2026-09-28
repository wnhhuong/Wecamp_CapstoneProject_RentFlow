// API base URL/environment configuration.
// VITE_API_URL is accepted as an alias for existing local environments.
const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  '/api'

export const API_BASE_URL = rawBaseUrl.trim().replace(/\/+$/, '')
