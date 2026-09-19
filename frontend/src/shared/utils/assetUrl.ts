import { API_BASE_URL } from '@/shared/api/config'

/** Uploads come back as server paths; the API origin is not the app origin. */
export function toAbsoluteAssetUrl(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path

  const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin
  return new URL(path, `${apiOrigin}/`).toString()
}
