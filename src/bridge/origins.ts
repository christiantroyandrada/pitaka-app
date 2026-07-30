/**
 * Exact origins, compiled in. Never a suffix or substring match: `endsWith`
 * would accept `evil-fintech.ctaprojects.xyz`, and `includes` would accept
 * `fintech.ctaprojects.xyz.attacker.com`. See ADR 8.
 */
export const RELEASE_ORIGINS: readonly string[] = ['https://fintech.ctaprojects.xyz']

/**
 * Plaintext dev servers, and they must never reach a release build. The app
 * registers a deep-link scheme, so a shipped `http://localhost` entry would let
 * `pitakaapp://webview?url=http://localhost:8081/x` load an attacker's page
 * from a local port and talk to the bridge.
 */
export const DEV_ONLY_ORIGINS: readonly string[] = [
  'http://localhost:5173',
  'http://localhost:8081',
]

export const ALLOWED_ORIGINS: readonly string[] = __DEV__
  ? [...RELEASE_ORIGINS, ...DEV_ONLY_ORIGINS]
  : RELEASE_ORIGINS

const originOf = (value: string): string | null => {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

/** Exported so a test can assert the release list directly; __DEV__ is true under jest. */
export function isAllowedIn(allowed: readonly string[], value: string): boolean {
  const origin = originOf(value)
  // javascript: and data: urls have an opaque origin, which serialises to
  // "null" and can never match an entry.
  if (!origin || origin === 'null') return false
  return allowed.includes(origin)
}

export const isAllowedUrl = (value: string): boolean => isAllowedIn(ALLOWED_ORIGINS, value)

/** Registry keys are interpolated into a path, so they stay strictly bounded. */
const REGISTRY_KEY = /^[a-z][a-z0-9-]*$/

export function h5UrlFor(baseUrl: string, registryKey: string): string | null {
  if (!REGISTRY_KEY.test(registryKey)) return null
  if (!isAllowedUrl(baseUrl)) return null
  return `${baseUrl.replace(/\/+$/, '')}/h5/${registryKey}/`
}
