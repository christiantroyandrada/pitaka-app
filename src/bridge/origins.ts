/**
 * Exact origins, compiled in. Never a suffix or substring match: `endsWith`
 * would accept `evil-fintech.ctaprojects.xyz`, and `includes` would accept
 * `fintech.ctaprojects.xyz.attacker.com`. See ADR 8.
 */
export const ALLOWED_ORIGINS: readonly string[] = [
  'https://fintech.ctaprojects.xyz',
  // The H5 dev server. Kept separate so production stays https-only.
  'http://localhost:5173',
  // The static H5 pages served alongside the Expo web build in development.
  'http://localhost:8081',
]

const originOf = (value: string): string | null => {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function isAllowedUrl(value: string): boolean {
  const origin = originOf(value)
  // A javascript: or data: url has an opaque origin, which serialises to "null"
  // and can never match an entry.
  if (!origin || origin === 'null') return false
  return ALLOWED_ORIGINS.includes(origin)
}

/** Registry keys are interpolated into a path, so they stay strictly bounded. */
const REGISTRY_KEY = /^[a-z][a-z0-9-]*$/

export function h5UrlFor(baseUrl: string, registryKey: string): string | null {
  if (!REGISTRY_KEY.test(registryKey)) return null
  if (!isAllowedUrl(baseUrl)) return null
  return `${baseUrl.replace(/\/+$/, '')}/h5/${registryKey}/`
}
